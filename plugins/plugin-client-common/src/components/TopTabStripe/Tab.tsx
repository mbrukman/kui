/*
 * Copyright 2020 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react'
import { Close16 } from '@carbon/icons-react'
import { i18n, eventBus, Event, ExecType, Theme } from '@kui-shell/core'

const strings = i18n('plugin-core-support')

export interface TabConfiguration {
  topTabNames?: 'command' | 'fixed' // was { topTabs } from '@kui-shell/client/config.d/style.json'
  productName?: string
}

type Props = TabConfiguration & {
  idx: number
  uuid: string
  active: boolean
  closeable: boolean
  onCloseTab: (idx: number) => void
  onSwitchTab: (idx: number) => void
}

interface State {
  title: string
  processing: boolean
  topTabNames: 'command' | 'fixed'
}

export default class Tab extends React.PureComponent<Props, State> {
  private onCommandStart: (evt: Event) => void
  private onCommandComplete: (evt: Event) => void
  private onThemeChange: ({ themeModel: Theme }) => void

  public constructor(props: Props) {
    super(props)

    this.state = {
      title: this.props.productName,
      processing: false,
      topTabNames: props.topTabNames || 'command'
    }

    this.addCommandEvaluationListeners()
  }

  public componentWillUnmount() {
    this.removeCommandEvaluationListeners()
  }

  private removeCommandEvaluationListeners() {
    eventBus.off('/command/start', this.onCommandStart)
    eventBus.off('/command/complete', this.onCommandComplete)
    eventBus.off('/theme/change', this.onThemeChange)
  }

  /**
   * Register any command evaluation listeners, i.e. when the REPL finishes evaluating a command.
   *
   */
  private addCommandEvaluationListeners() {
    this.onCommandComplete = (event: Event) => {
      if (this.props.uuid === event.tab.state.uuid) {
        if (event.execType !== undefined && event.execType !== ExecType.Nested && event.route) {
          // ignore nested, which means one plugin calling another
          this.setState({ processing: false })
        }

        this.setState({ processing: false })
      }
    }

    this.onCommandStart = (event: Event) => {
      if (this.props.uuid === event.tab.state.uuid) {
        if (event.execType !== undefined && event.execType !== ExecType.Nested && event.route) {
          // ignore nested, which means one plugin calling another
          // debug('got event', event)
          if (
            event.route !== undefined &&
            !event.route.match(/^\/(tab|getting\/started)/) // ignore our own events and help
          ) {
            if (this.isUsingCommandName()) {
              this.setState({ processing: true, title: event.command || this.state.title })
              return
            }
          }

          this.setState({ processing: true })
        }
      }
    }

    this.onThemeChange = ({ themeModel }: { themeModel: Theme }) => {
      this.setState({
        topTabNames: themeModel.topTabNames || 'command'
      })
    }

    eventBus.on('/command/start', this.onCommandStart)
    eventBus.on('/command/complete', this.onCommandComplete)
    eventBus.on('/theme/change', this.onThemeChange)
  }

  private isUsingCommandName() {
    return this.state.topTabNames === 'command' // && !document.body.classList.contains('kui--alternate')
  }

  public render() {
    return (
      <a
        href="#"
        className={
          'kui-tab left-tab-stripe-button kui--tab-navigatable' +
          (this.props.active ? ' kui-tab--active left-tab-stripe-button-selected' : '') +
          (this.state.processing ? ' processing' : '')
        }
        data-tab-button-index={this.props.idx + 1}
        aria-label="tab"
        tabIndex={2}
        onMouseDown={evt => {
          evt.preventDefault()
          evt.stopPropagation()
        }}
        onClick={() => {
          this.props.onSwitchTab(this.props.idx)
        }}
      >
        <div className="kui-tab--label left-tab-stripe-button-label">
          {this.isUsingCommandName() && this.state.title}
          {!this.isUsingCommandName() && <span className="kui-tab--label-text">{strings('Tab')} </span>}
          {!this.isUsingCommandName() && <span className="kui-tab--label-index"></span>}
        </div>

        {this.props.closeable && (
          <div
            className="left-tab-stripe-button-closer"
            onClick={evt => {
              evt.stopPropagation()
              evt.preventDefault()
              this.props.onCloseTab(this.props.idx)
            }}
          >
            <Close16 focusable="false" width={12} height={16} preserveAspectRatio="xMidYMid meet" aria-hidden="true" />
          </div>
        )}
      </a>
    )
  }
}