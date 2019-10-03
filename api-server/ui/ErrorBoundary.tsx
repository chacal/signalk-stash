import * as React from 'react'
import { Component, ErrorInfo } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
}

export default class ErrorBoundary extends Component<{}, ErrorBoundaryState> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log(error)
    console.log(errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>
    }

    return this.props.children
  }
}
