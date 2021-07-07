import { Year } from '@js-joda/core'
import { xorBy } from 'lodash'
import { BehaviorSubject } from 'rxjs'
import { take } from 'rxjs/operators'

export class SelectedYears {
  years: Year[]
  constructor(years: Year[]) {
    this.years = years
  }
  isSelected(y: Year) {
    return (
      this.years.find(x => {
        return x.value() === y.value()
      }) !== undefined
    )
  }
  toKey() {
    return this.years.toString()
  }
  toArray() {
    return this.years
  }
}

export const YEARS = new SelectedYears([2019, 2020, 2021].map(Year.of))
export const SELECTABLE_YEARS = YEARS.toArray()

export default class TimeSelectionState {
  static fromLocalStorage() {
    try {
      const selectedYears = localStorage.getItem('selectedyears') || ''
      return !!selectedYears
        ? new TimeSelectionState(
            JSON.parse(selectedYears).map((ys: string) => Year.of(Number(ys)))
          )
        : new TimeSelectionState()
    } catch {
      return new TimeSelectionState()
    }
  }
  selectedYears: BehaviorSubject<SelectedYears>
  constructor(years?: Year[]) {
    this.selectedYears = new BehaviorSubject<SelectedYears>(
      years ? new SelectedYears(years) : YEARS
    )
    this.selectedYears.subscribe(selection => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          'selectedyears',
          JSON.stringify(selection.toArray())
        )
      }
    })
  }

  toggleYear(y: Year) {
    this.selectedYears.pipe(take(1)).subscribe(oldSelection => {
      this.selectedYears.next(
        new SelectedYears(xorBy(oldSelection.toArray(), [y], x => x.toString()))
      )
    })
  }
}
