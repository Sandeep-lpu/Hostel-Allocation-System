/**
 * Lifecycle status of an individual Bed Inventory unit
 */
export enum BedStatus {
  /**
   * Available for selection and allocation
   */
  AVAILABLE = 'AVAILABLE',

  /**
   * Temporarily locked in a student's active shopping cart (e.g. 10-minute hold)
   */
  LOCKED_IN_CART = 'LOCKED_IN_CART',

  /**
   * Confirmed and allocated to a student
   */
  BOOKED = 'BOOKED',

  /**
   * Offline for repairs or administrative holding
   */
  MAINTENANCE = 'MAINTENANCE',
}
