import { Year } from 'js-joda'
import { xor } from 'lodash'
import { BehaviorSubject } from 'rxjs'
import { take } from 'rxjs/operators'

export class SelectedYears {
  years: Year[]
  constructor(years: Year[]) {
    this.years = years
  }
  isSelected(y: Year) {
    return this.years.indexOf(y) >= 0
  }
  toKey() {
    return this.years.toString()
  }
  toArray() {
    return this.years
  }
}

export const YEARS = new SelectedYears([2019, 2020, 2021].map(Year.of))

export function fromLocalStorage() {
  return new TimeSelectionState()
}

export default class TimeSelectionState {
  selectedYears: BehaviorSubject<SelectedYears> = new BehaviorSubject<
    SelectedYears
  >(YEARS)

  toggleYear(y: Year) {
    this.selectedYears.pipe(take(1)).subscribe(oldSelection => {
      this.selectedYears.next(
        new SelectedYears(xor(oldSelection.toArray(), [y]))
      )
    })
  }
}
