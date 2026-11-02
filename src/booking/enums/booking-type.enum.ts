/**
 * Residential Booking Type
 */
export enum BookingType {
  /**
   * Fresh allocation for students booking a bed for the first time
   */
  FRESH_ALLOCATION = 'FRESH_ALLOCATION',

  /**
   * Room or Hostel change for students who already hold a confirmed bed
   */
  HOSTEL_CHANGE = 'HOSTEL_CHANGE',

  /**
   * Upgrading or changing Mess, Laundry, or Gym packages without moving beds
   */
  FOOD_CHANGE = 'FOOD_CHANGE',
}

