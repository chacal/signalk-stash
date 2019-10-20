import {
  Checkbox,
  CircularProgress,
  createStyles,
  FormControl,
  FormGroup,
  FormLabel,
  Snackbar,
  SnackbarContent,
  WithStyles,
  withStyles
} from '@material-ui/core'
import Container from '@material-ui/core/Container'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Paper from '@material-ui/core/Paper'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import _ from 'lodash'
import * as React from 'react'
import { useObservable } from './bacon-react'
import { TrackLengthsPanelState } from './tracklengthspanel-state'
import { Vessel, VesselSelectionState } from './vesselselection-state'

const meters2nm = 0.000539957
const hasMovedThresholdMeters = 0.05 / meters2nm

const trackLengthStyles = createStyles({
  root: {
    width: '100%',
    // marginTop: theme.spacing(3),
    overflowX: 'auto'
  },
  table: {
    minWidth: 650
  },
  progress: {
    margin: 10
  }
})

const TrackLengthsPanel = ({
  vesselSelection
}: {
  vesselSelection: VesselSelectionState
}) => {
  const panelState = new TrackLengthsPanelState(vesselSelection)

  return (
    <React.Fragment>
      <VesselSelectionPanel selectionState={panelState.vesselSelectionState} />
      <TrackLengthList trackLengthsPanelState={panelState} />
    </React.Fragment>
  )
}

interface TLPProps extends WithStyles<typeof trackLengthStyles> {
  trackLengthsPanelState: TrackLengthsPanelState
}

const TrackLengthList = withStyles(trackLengthStyles)(
  ({ trackLengthsPanelState, classes }: TLPProps) => {
    const isLoading = useObservable(trackLengthsPanelState.isLoading)
    const isError = useObservable(trackLengthsPanelState.isError)
    const tracks = useObservable(trackLengthsPanelState.tracks)

    return (
      <Paper className={classes.root}>
        {isLoading && (
          <Container>
            <CircularProgress className={classes.progress} />
          </Container>
        )}
        {isError && (
          <Snackbar
            open={true}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left'
            }}
          >
            <SnackbarContent message={'Could not load track lengths.'} />
          </Snackbar>
        )}
        {
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell>Vessel</TableCell>
                <TableCell align="right">Day</TableCell>
                <TableCell align="right">Distance covered(nm)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {_.flatten(tracks)
                .filter(tl => tl.length > hasMovedThresholdMeters)
                .sort((a, b) => a.start.localeCompare(b.start))
                .map(row => (
                  <TableRow key={`${row.context}${row.start}`}>
                    <TableCell component="th" scope="row">
                      {row.name}
                    </TableCell>
                    <TableCell align="right">
                      {row.start.substring(0, 10)}
                    </TableCell>
                    <TableCell align="right">
                      {(row.length * meters2nm).toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        }
      </Paper>
    )
  }
)

interface VesselSelectionPanelProps {
  selectionState: VesselSelectionState
}

const VesselSelectionPanel = ({
  selectionState
}: VesselSelectionPanelProps) => {
  const vessels = useObservable(selectionState.vessels)
  const selectedVessels = useObservable(selectionState.selectedVessels)

  const vesselSelectionChanged = (vessel: Vessel) => (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    const newSelection = checked
      ? _.concat(selectedVessels, vessel.vesselId)
      : _.without(selectedVessels, vessel.vesselId)
    selectionState.selectedVessels.set(newSelection)
  }

  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">Select vessels</FormLabel>
      <FormGroup>
        {vessels.map(v => (
          <FormControlLabel
            key={v.vesselId}
            control={
              <Checkbox
                checked={selectedVessels.includes(v.vesselId)}
                onChange={vesselSelectionChanged(v)}
                value={v.name}
              />
            }
            label={v.name}
          />
        ))}
      </FormGroup>
    </FormControl>
  )
}

export default TrackLengthsPanel
