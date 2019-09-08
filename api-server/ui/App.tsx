import * as React from 'react'
import { AppState } from './ui-domain'

interface AppProps {
  appState: AppState
}

const App = ({ appState }: AppProps) => (
  <React.Fragment>Hello World!</React.Fragment>
)

export default App
