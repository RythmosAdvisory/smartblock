import * as React from 'react'
import styled from 'styled-components';
import { Editor } from '@aeaton/react-prosemirror';
import InlineMenuBar from './prose-inline-menu';
import PositionBtns from './prose-position-btns';
import Floater from './prose-floater';
import plugins from './prose-config/plugins';
import './styles/base.css';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import keys from './prose-config/keys';
import { Node, DOMParser, DOMSerializer } from 'prosemirror-model';
import { chainCommands } from 'prosemirror-commands';
import scrollTo from 'scroll-to';
import { getScrollTop, getOffset, getViewport } from './util';
import extensions from './extensions';
import { Extension } from './types';

const Input = styled('div')`
  width: 100%;
  overflow-y: auto;
`

const Container = styled.div`
  max-width: 780px;
  margin: 0 auto;
  position: relative;
  padding: 10px 0 80px 0;
`;

interface ProseRender {
  editor: React.ReactChild;
  view: EditorView;
}

type OutputJson = {
  [key: string]: any
}

type AppProps = {
  onChange(json: OutputJson): void;
  json?: OutputJson;
  html?: string;
  extensions: Extension[]
}

type AppState = {
  doc: Node
}

export default class App extends React.Component<AppProps, AppState> {
  container: HTMLElement;
  schema!: Schema;

  static defaultProps = {
    extensions
  };

  constructor(props) {
    super(props);
    const { html, json, extensions } = props;
    const schema = this.getSchemaFromExtensions(extensions);
    this.schema = schema;
    let realHtml = html;

    if (json) {
      const node = Node.fromJSON(this.schema, json);
      realHtml = this.getHtmlFromNode(node, schema);
    }
    const div = document.createElement('div');
    div.innerHTML = realHtml;
    const doc = DOMParser.fromSchema(this.schema).parse(div);
    this.state = { doc };
  }

  getBlockSchemas(extensions: Extension[]) {
    const nodesSchema = this.getBlocks(extensions);
    const nodes = nodesSchema.reduce((node, curr, index) => {
      const newNode = {[curr.name]: { ...curr.schema }};
      return {...node, ...newNode};
    }, {});
    return nodes;
  }

  getBlocks(extensions: Extension[]) {
    const nodesSchema = extensions.filter(extension => {
      if (extension.schema.group === 'block') {
        return true;
      }
      return false;
    });
    return nodesSchema;
  }

  getMarkSchemas(extensions: Extension[]) {
    const marksSchema = this.getMarks(extensions);
    const marks = marksSchema.reduce((mark, curr, index) => {
      const newMark = {[curr.name]: { ...curr.schema }};
      return {...mark, ...newMark };
    }, {});
    return marks;
  }

  getMarks(extensions: Extension[]) {
    const marksSchema = extensions.filter(extension => {
      if (extension.schema.group === 'mark') {
        return true;
      }
      return false;
    });
    return marksSchema;
  }

  getSchemaFromExtensions(extensions: Extension[]) {
    let nodes = this.getBlockSchemas(extensions);
    const base = { 
      doc: {
        content: 'block+'
      },
      text: {
        group: 'inline'
      },
      hard_break: {
        inline: true,
        group: "inline",
        selectable: false,
        parseDOM: [{tag: "br"}],
        toDOM() { return ['br'] }
      }
    };
    nodes = { ...nodes , ...base }
    const marks = this.getMarkSchemas(extensions);
    return new Schema({ nodes, marks } as { nodes: any, marks: any });
  }

  getHtmlFromNode(doc: Node, schema: Schema) {
    const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content);
    const div = document.createElement('div');
    div.appendChild(fragment);
    return div.innerHTML;
  }

  getKeys(extensions: Extension[]) {
    let extensionKeys = {};
    extensions.forEach((extension) => {
      if (extension.keys) {
        extensionKeys = { ...extensionKeys, ...extension.keys(this.schema) }
      }
    });
    Object.keys(keys).forEach((key) => {
      if (extensionKeys[key]) {
        extensionKeys[key] = chainCommands(extensionKeys[key], keys[key])
      } else {
        extensionKeys[key] = keys[key]
      }
    });
    return keymap(extensionKeys);
  }

  getPlugins() {
    const { extensions } = this.props;
    let customPlugins = [];
    extensions.forEach((extension) => {
      if (extension.plugins) {
        customPlugins = [...customPlugins, ...extension.plugins];
      } 
    });
    const keyPlugin = this.getKeys(extensions);
    return [...plugins, ...customPlugins, keyPlugin];
  }

  getMenu(extensions: Extension[]) {
    return extensions.filter((extension) => extension.showMenu);
  }

  render() {
    const { extensions } = this.props;
    const { doc } = this.state;
    const { schema } = this;
    const editorOptions = { schema, plugins: this.getPlugins(), doc };
    const blocks = this.getBlocks(extensions);
    const marks = this.getMarks(extensions);

    return (
      <Container id="container" ref={(ref) => this.container = ref}>
        <Input>
          <Editor
            place
            options={editorOptions}
            onChange={(doc: Node) => {
              const selected = this.container.querySelector('.selected') as HTMLDivElement;
              if (selected) {
                const viewport = getViewport();
                const top = getScrollTop() + viewport.height;
                const offsetTop = getOffset(selected).top;
                const height = selected.offsetHeight;
                if (offsetTop + height + 80 >= top) {
                  if (/iPod|iPhone|iPad/.test(navigator.platform) && document.activeElement) {
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement.isContentEditable) {
                      scrollTo(0, offsetTop);
                    }
                  } else {
                    scrollTo(0, offsetTop + height + 80);
                  }
                }
              }
              if (this.props.onChange) {
                const json = doc.toJSON();
                const html = this.getHtmlFromNode(doc, this.schema);
                this.props.onChange({
                  json, html
                });
              }
            }}
            render={({ editor, view } : ProseRender) => (
              <React.Fragment>
                <PositionBtns view={view} menu={{ blocks: this.getMenu(blocks) }} />
                <InlineMenuBar menu={{ marks: this.getMenu(marks) }} view={view} />
                {editor}
              </React.Fragment>
            )}
          />
        </Input>
    </Container>);
  }
}