import * as React from 'react'
import { useEffect, useState } from 'react'

import {
  Collapse,
  createStyles,
  ListItem,
  Paper,
  Slider,
  withStyles,
  WithStyles
} from '@material-ui/core'
import { KeyboardArrowDown, KeyboardArrowUp } from '@material-ui/icons'
import { Observable } from 'rxjs'
import { useObservable } from 'rxjs-hooks'
import { initialViewport } from './mappanel-state'

const vspStyles = createStyles({
  root: {
    position: 'absolute',
    top: '60px',
    right: '10px',
    'z-index': 2000
  },
  slider: {
    height: '400px',
    padding: '10px',
    paddingBottom: '20px',
    display: 'inline-flex',
    justifyContent: 'center'
  }
})

interface VSPProps extends WithStyles<typeof vspStyles> {
  zoom: Observable<number>
}

const MapVisibilityAdjustmentPanel = withStyles(vspStyles)(
  ({ classes, zoom }: VSPProps) => {
    const theZoom = useObservable(() => zoom) || initialViewport.zoom
    const [brightness, setBrightness] = useState(
      brightnessFromLocalStorageOrDefault()
    )
    const [contrast, setContrast] = useState(
      contrastFromLocalStorageOrDefault()
    )
    const [collapsed, setCollapsed] = useState(true)

    useEffect(() => setBrightnessCss(brightness))
    useEffect(() => setContrastCss(contrast))

    const brightnessSliderChanged = (
      e: React.ChangeEvent<{}>,
      newValue: number | number[]
    ) => {
      setBrightness(newValue as number)
      setBrightnessCss(newValue as number)
      saveBrightnessToLocalStorage(newValue as number)
    }

    const contrastSliderChanged = (
      e: React.ChangeEvent<{}>,
      newValue: number | number[]
    ) => {
      setContrast(newValue as number)
      setContrastCss(newValue as number)
      saveContrastToLocalStorage(newValue as number)
    }

    return (
      <Paper className={classes.root} hidden={theZoom < 16}>
        <span onClick={() => setCollapsed(!collapsed)}>
          <ListItem>
            {collapsed ? <KeyboardArrowDown /> : <KeyboardArrowUp />}
          </ListItem>
        </span>
        <Collapse in={!collapsed}>
          <div className={classes.slider}>
            <Slider
              orientation="vertical"
              min={100}
              max={400}
              value={brightness}
              onChange={brightnessSliderChanged}
            />
          </div>
          <div className={classes.slider}>
            <Slider
              orientation="vertical"
              min={100}
              max={300}
              value={contrast}
              onChange={contrastSliderChanged}
            />
          </div>
        </Collapse>
      </Paper>
    )
  }
)

export default MapVisibilityAdjustmentPanel

function saveBrightnessToLocalStorage(brightness: number) {
  saveNumberToLocalStorage('imageryBrightness', brightness)
}

function brightnessFromLocalStorageOrDefault() {
  return numberFromLocalStorageOrDefault('imageryBrightness', 100)
}

function saveContrastToLocalStorage(contrast: number) {
  saveNumberToLocalStorage('imageryContrast', contrast)
}
function contrastFromLocalStorageOrDefault() {
  return numberFromLocalStorageOrDefault('imageryContrast', 100)
}

function saveNumberToLocalStorage(key: string, value: number) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

function numberFromLocalStorageOrDefault(key: string, defaultValue: number) {
  try {
    const state = localStorage.getItem(key)
    return !!state ? (JSON.parse(state) as number) : defaultValue
  } catch {
    return defaultValue
  }
}

function setBrightnessCss(brightness: number) {
  setRootCssVariable('--brightness', brightness + '%')
}

function setContrastCss(contrast: number) {
  setRootCssVariable('--contrast', contrast + '%')
}

function setRootCssVariable(key: string, value: string) {
  const r = document.querySelector(':root') as HTMLElement
  r.style.setProperty(key, value)
}
