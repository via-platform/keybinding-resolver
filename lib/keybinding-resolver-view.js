"use babel";
/** @jsx etch.dom */

const {Disposable, CompositeDisposable} = require('via');
const fs = require('fs-plus');
const path = require('path');
const etch = require('etch');

module.exports = class KeyBindingResolverView {
  constructor () {
    this.keystrokes = null
    this.usedKeyBinding = null
    this.unusedKeyBindings = []
    this.unmatchedKeyBindings = []
    this.partiallyMatchedBindings = []
    etch.initialize(this)
  }

  serialize () {
    return this.panel ? {attached: this.panel.isVisible()} : {attached: false}
  }

  destroy () {
    this.detach()
    return etch.destroy(this)
  }

  toggle () {
    if (this.panel && this.panel.isVisible()) {
      this.detach()
    } else {
      this.attach()
    }
  }

  attach () {
    this.disposables = new CompositeDisposable()
    this.panel = via.workspace.addBottomPanel({item: this})
    this.disposables.add(new Disposable(() => {
      this.panel.destroy()
      this.panel = null
    }))

    this.disposables.add(via.keymaps.onDidMatchBinding(({keystrokes, binding, keyboardEventTarget, eventType}) => {
      if (eventType === 'keyup' && binding == null) {
        return
      }

      const unusedKeyBindings = via.keymaps
        .findKeyBindings({keystrokes, target: keyboardEventTarget})
        .filter((b) => b !== binding)

      const unmatchedKeyBindings = via.keymaps
        .findKeyBindings({keystrokes})
        .filter((b) => b !== binding && !unusedKeyBindings.includes(b))

      this.update({usedKeyBinding: binding, unusedKeyBindings, unmatchedKeyBindings, keystrokes})
    }))

    this.disposables.add(via.keymaps.onDidPartiallyMatchBindings(({keystrokes, partiallyMatchedBindings}) => {
      this.update({keystrokes, partiallyMatchedBindings})
    }))

    this.disposables.add(via.keymaps.onDidFailToMatchBinding(({keystrokes, keyboardEventTarget, eventType}) => {
      if (eventType === 'keyup') {
        return
      }

      const unusedKeyBindings = via.keymaps.findKeyBindings({keystrokes, target: keyboardEventTarget})
      const unmatchedKeyBindings = via.keymaps
        .findKeyBindings({keystrokes})
        .filter((b) => !unusedKeyBindings.includes(b))

      this.update({unusedKeyBindings, unmatchedKeyBindings, keystrokes})
    }))
  }

  detach () {
    if (this.disposables) {
      this.disposables.dispose()
    }
  }

  update (props) {
    this.keystrokes = props.keystrokes
    this.usedKeyBinding = props.usedKeyBinding
    this.unusedKeyBindings = props.unusedKeyBindings || []
    this.unmatchedKeyBindings = props.unmatchedKeyBindings || []
    this.partiallyMatchedBindings = props.partiallyMatchedBindings || []
    return etch.update(this)
  }

  render () {
    return (
      <div className='key-binding-resolver'>
        <div className='panel-heading padded'>
          <span>Key Binding Resolver: </span>
          {this.renderKeystrokes()}
        </div>
        <div className='panel-body padded'>{this.renderKeyBindings()}</div>
      </div>
    )
  }

  renderKeystrokes () {
    if (this.keystrokes) {
      if (this.partiallyMatchedBindings.length > 0) {
        return <span className='keystroke'>{this.keystrokes} (partial)</span>
      } else {
        return <span className='keystroke'>{this.keystrokes}</span>
      }
    } else {
      return <span>Press any key: </span>
    }
  }

  renderKeyBindings () {
    if (this.partiallyMatchedBindings.length > 0) {
      return (
        <table className='table-condensed'>
          <tbody>
            {this.partiallyMatchedBindings.map((binding) => (
              <tr className='unused'>
                <td className='command'>{binding.command}</td>
                <td className='keystrokes'>{binding.keystrokes}</td>
                <td className='selector'>{binding.selector}</td>
                <td className='source'>{binding.source}</td>
              </tr>
          ))}
          </tbody>
        </table>
      )
    } else {
      let usedKeyBinding = ''
      if (this.usedKeyBinding) {
        usedKeyBinding = (
          <tr className='used'>
            <td className='command'>{this.usedKeyBinding.command}</td>
            <td className='selector'>{this.usedKeyBinding.selector}</td>
            <td className='source'>{this.usedKeyBinding.source}</td>
          </tr>
        )
      }
      return (
        <table className='table-condensed'>
          <tbody>
            {usedKeyBinding}
            {this.unusedKeyBindings.map((binding) => (
              <tr className='unused'>
                <td className='command'>{binding.command}</td>
                <td className='selector'>{binding.selector}</td>
                <td className='source'>{binding.source}</td>
              </tr>
            ))}
            {this.unmatchedKeyBindings.map((binding) => (
              <tr className='unmatched'>
                <td className='command'>{binding.command}</td>
                <td className='selector'>{binding.selector}</td>
                <td className='source'>{binding.source}</td>
              </tr>
          ))}
          </tbody>
        </table>
      )
    }
  }
}
