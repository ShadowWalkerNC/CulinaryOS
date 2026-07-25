export function initialHoldStatus(courseNumber: number): 'firing' | 'held' {
  return courseNumber === 1 ? 'firing' : 'held';
}
