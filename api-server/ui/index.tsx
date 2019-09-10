import * as React from 'react'
import * as ReactDOM from 'react-dom'

import App from './App'
import './main.less'
import { initializeUiState } from './ui-state'

const appState = initializeUiState()

// Render main component
ReactDOM.render(<App appState={appState} />, document.getElementById('main'))
