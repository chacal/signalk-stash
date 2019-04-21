import * as U from 'karet.util'

import MCheckbox from '@material-ui/core/Checkbox'
import MList from '@material-ui/core/List'
import MListItem from '@material-ui/core/ListItem'
import MListItemText from '@material-ui/core/ListItemText'
import MPaper from '@material-ui/core/Paper'
import { Map as LeafletMap } from 'react-leaflet'

export const CheckBox = U.toKaret(MCheckbox)
export const List = U.toKaret(MList)
export const ListItem = U.toKaret(MListItem)
export const ListItemText = U.toKaret(MListItemText)
export const Paper = U.toKaret(MPaper)

export const Map = U.toKaret(LeafletMap)
