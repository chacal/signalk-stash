import {
  CircularProgress,
  Container,
  createStyles,
  Paper,
  Snackbar,
  SnackbarContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@material-ui/core'
import { WithStyles, withStyles } from '@material-ui/styles'
import _ from 'lodash'
import * as React from 'react'
import { useObservable } from 'rxjs-hooks'
import { TrackLengthsPanelState } from './tracklengthspanel-state'

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

interface TLLProps extends WithStyles<typeof trackLengthStyles> {
  trackLengthsPanelState: TrackLengthsPanelState
}

const TrackLengthList = withStyles(trackLengthStyles)(
  ({ trackLengthsPanelState, classes }: TLLProps) => {
    const isLoading = useObservable<boolean>(
      () => trackLengthsPanelState.isLoading
    )
    const isError = useObservable<boolean>(() => trackLengthsPanelState.isError)
    const tracks = useObservable(() => trackLengthsPanelState.tracks)

    let totalLength = 0
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
                <TableCell align="right">Distance(nm)</TableCell>
                <TableCell align="right">Cumulated Distance(nm)</TableCell>
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
                    <TableCell align="right">
                      {(totalLength += row.length * meters2nm).toFixed(1)}
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

export default TrackLengthList
