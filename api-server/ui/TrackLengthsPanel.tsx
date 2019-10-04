import {
  CircularProgress,
  createStyles,
  Snackbar,
  SnackbarContent,
  WithStyles,
  withStyles
} from '@material-ui/core'
import Container from '@material-ui/core/Container'
import Paper from '@material-ui/core/Paper'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import { Property } from 'baconjs'
import { flatten } from 'lodash'
import * as React from 'react'
import { Atom } from '../domain/Atom'
import { VesselData } from '../domain/Vessel'
import { fetchTrackLengths, loadVessels } from './backend-requests'
import { useObservable } from './bacon-react'

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

interface TLPProps extends WithStyles<typeof trackLengthStyles> {
  trackLengthsStateP: Property<TrackLengthsState>
}

interface TrackLength {
  context: string
  start: string
  end: string
  length: number
}

interface TrackLengthWithName extends TrackLength {
  name: string
}

interface TrackLengthsState {
  isLoading: boolean
  isError: boolean
  tracks: TrackLengthWithName[]
}

const TrackLengthsPanel = () => {
  const listState = Atom<TrackLengthsState>({
    isLoading: true,
    isError: false,
    tracks: []
  })
  React.useEffect(() => {
    loadVessels()
      .then(fetchTrackLengthsWithNames)
      // flatten: single list for all vessels
      .then(flatten)
      .then(filterByMinLength)
      .then(sortByStartDay)
      .then((trackLengths: TrackLengthWithName[]) =>
        listState.set({
          isLoading: false,
          isError: false,
          tracks: trackLengths
        })
      )
      .catch((e: Error) =>
        listState.set({
          isLoading: false,
          isError: true,
          tracks: []
        })
      )
  })

  return <TrackLengthList trackLengthsStateP={listState} />
}

const TrackLengthList = withStyles(trackLengthStyles)(
  ({ trackLengthsStateP, classes }: TLPProps) => {
    const trackLengthsState = useObservable(trackLengthsStateP)
    return (
      <Paper className={classes.root}>
        {trackLengthsState.isLoading && (
          <Container>
            <CircularProgress className={classes.progress} />
          </Container>
        )}
        {trackLengthsState.isError && (
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
        {!trackLengthsState.isLoading && (
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell>Vessel</TableCell>
                <TableCell align="right">Day</TableCell>
                <TableCell align="right">Distance covered(nm)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trackLengthsState.tracks.map(row => (
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
        )}
      </Paper>
    )
  }
)

const fetchTrackLengthsWithNames = (
  vessels: VesselData[]
): Promise<TrackLengthWithName[][]> => {
  return Promise.all(
    vessels.map(({ vesselId, name }: VesselData) =>
      fetchTrackLengths(vesselId).then((trackLengthsA: TrackLength[]) =>
        trackLengthsA.map(
          trackLength => ({ name, ...trackLength } as TrackLengthWithName)
        )
      )
    )
  )
}

const filterByMinLength = (trackLengths: TrackLengthWithName[]) =>
  trackLengths.filter(tl => tl.length > hasMovedThresholdMeters)

const sortByStartDay = (trackLengths: TrackLengthWithName[]) =>
  trackLengths.sort((a, b) => a.start.localeCompare(b.start))

export default TrackLengthsPanel
