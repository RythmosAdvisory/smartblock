import * as React from 'react'
import { toggleMark } from 'prosemirror-commands'
import LinkIcon from '../../components/icons/Link'
import { Extension } from '../../types'
import { markActive, getMarkInSelection } from '../../utils'
import tooltip from './tooltip'

export default class Link implements Extension {
  get name() {
    return 'link'
  }

  get group() {
    return 'mark'
  }

  get showMenu() {
    return true
  }

  get schema() {
    return {
      group: 'mark',
      attrs: {
        href: {},
        editing: { default: true },
        title: { default: null }
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs(dom) {
            return {
              href: dom.getAttribute('href'),
              title: dom.getAttribute('title')
            }
          }
        }
      ],
      toDOM(node) {
        const { href, title } = node.attrs
        return ['a', { href, title }, 0]
      }
    }
  }

  get icon() {
    return <LinkIcon style={{ width: '24px', height: '24px' }} />
  }

  get plugins() {
    return [tooltip()]
  }

  active(state) {
    return markActive(state.schema.marks.link)(state)
  }

  onClick(state, dispatch) {
    if (markActive(state.schema.marks.link)(state)) {
      const link = getMarkInSelection('link', state)
      const { selection } = state
      const { $anchor } = selection
      const { nodeBefore, nodeAfter, pos } = $anchor
      let beforePos = selection.from
      let afterPos = selection.to
      if (beforePos === afterPos && nodeBefore && nodeAfter) {
        beforePos = pos - nodeBefore.nodeSize
        afterPos = pos + nodeAfter.nodeSize
      }
      const { tr } = state
      tr.removeMark(beforePos, afterPos, state.schema.marks.link)
      tr.addMark(
        beforePos,
        afterPos,
        state.schema.marks.link.create({ href: link.attrs.href, editing: true })
      )
      // dispatch
      dispatch(tr.scrollIntoView())
      return true
    }

    toggleMark(state.schema.marks.link, { href: '', editing: true })(
      state,
      dispatch
    )
  }
}
