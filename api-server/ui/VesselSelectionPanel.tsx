import { SKContext } from '@chacal/signalk-ts'
import { createStyles, WithStyles, withStyles } from '@material-ui/core'
import * as React from 'karet'
import * as U from 'karet.util'
import { Atom } from 'kefir.atom'
import * as K from './karet-components'
import { Vessel } from './ui-domain'

//
//   VesselSelection
//
const vsStyles = createStyles({
  button: {
    padding: '0 6px 0 16px'
  }
})
interface VSProps extends WithStyles<typeof vsStyles> {
  vessel: Atom<Vessel>
}

const VesselSelection = withStyles(vsStyles)(({ vessel, classes }: VSProps) => {
  const checked = U.view<Atom<boolean>>('selected', vessel)
  const context = U.view<Atom<SKContext>>('context', vessel)
  const onClick = () => checked.modify(currentValue => !currentValue)

  return (
    <K.ListItem button classes={classes} onClick={onClick}>
      <K.ListItemText primary={context} />
      <K.CheckBox
        color={'primary'}
        checked={checked}
        onChange={U.getProps({ checked })}
      />
    </K.ListItem>
  )
})

//
//   VesselSelectionPanel
//
const vspStyles = createStyles({
  root: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    'z-index': 2000
  }
})

interface VSPProps extends WithStyles<typeof vspStyles> {
  vessels: Atom<Vessel[]>
}

const VesselSelectionPanel = withStyles(vspStyles)(
  ({ vessels, classes }: VSPProps) => (
    <K.Paper classes={classes}>
      <K.List>
        {U.mapElemsWithIds(
          'context',
          (vessel, context) => (
            <VesselSelection key={context} vessel={vessel} />
          ),
          vessels
        )}
      </K.List>
    </K.Paper>
  )
)

export default VesselSelectionPanel
