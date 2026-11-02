/**
 * Dynamic Availability Badge computed by merging static catalog with live Redis seat counters
 */
export enum AvailabilityTag {
  AVAILABLE = 'AVAILABLE',
  LIMITED_SEATS_LEFT = 'LIMITED_SEATS_LEFT',
  WAITLIST_ONLY = 'WAITLIST_ONLY',
}
