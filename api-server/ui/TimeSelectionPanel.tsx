import * as React from 'react'
import { useState } from 'react'

import { Year } from '@js-joda/core'
import {
  Checkbox,
  Collapse,
  createStyles,
  List,
  ListItem,
  ListItemText,
  Paper,
  withStyles,
  WithStyles
} from '@material-ui/core'
import { KeyboardArrowDown, KeyboardArrowUp } from '@material-ui/icons'
import { useObservable } from 'rxjs-hooks'
import TimeSelectionState, { SELECTABLE_YEARS } from './timeselection-state'

const vspStyles = createStyles({
  root: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    'z-index': 2000
  }
})

const ysStyles = createStyles({
  button: {
    padding: '0 6px 0 16px'
  }
})
interface YSProps extends WithStyles<typeof ysStyles> {
  year: Year
  selected: boolean
  toggle: () => void
}

const YearSelection = withStyles(ysStyles)(
  ({ year, selected, toggle, classes }: YSProps) => {
    return (
      <ListItem button classes={classes} onClick={toggle}>
        <ListItemText primary={year.toString()} />
        <Checkbox color={'primary'} checked={selected} />
      </ListItem>
    )
  }
)

interface VSPProps extends WithStyles<typeof vspStyles> {
  timeselection: TimeSelectionState
}

const TimeSelectionPanel = withStyles(vspStyles)(
  ({ timeselection, classes }: VSPProps) => {
    const selectedYears = useObservable(() => timeselection.selectedYears)
    const [collapsed, setCollapsed] = useState(true)
    return (
      <Paper classes={classes}>
        <span onClick={() => setCollapsed(!collapsed)}>
          <ListItem>
            {collapsed ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </ListItem>
        </span>
        <Collapse in={!collapsed}>
          <List>
            {SELECTABLE_YEARS.map(yr => (
              <YearSelection
                key={yr.toString()}
                year={yr}
                selected={selectedYears ? selectedYears.isSelected(yr) : false}
                toggle={() => timeselection.toggleYear(yr)}
              />
            ))}
          </List>
        </Collapse>
      </Paper>
    )
  }
)

export default TimeSelectionPanel
