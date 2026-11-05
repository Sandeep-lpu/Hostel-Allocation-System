import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoommateProfileDocument = HydratedDocument<RoommateProfile>;

export enum SleepSchedule {
  EARLY_BIRD = 'EARLY_BIRD', // sleeps before 11 PM
  NIGHT_OWL = 'NIGHT_OWL',   // sleeps after 1 AM
  FLEXIBLE = 'FLEXIBLE',
}

export enum CleanlinessLevel {
  VERY_CLEAN = 'VERY_CLEAN',
  MODERATE = 'MODERATE',
  RELAXED = 'RELAXED',
}

export enum StudyHabit {
  SILENT_STUDY = 'SILENT_STUDY',
  BACKGROUND_MUSIC = 'BACKGROUND_MUSIC',
  GROUP_STUDY = 'GROUP_STUDY',
}

export enum SocialStyle {
  INTROVERT = 'INTROVERT',
  EXTROVERT = 'EXTROVERT',
  BALANCED = 'BALANCED',
}

export enum RoomTempPreference {
  AC_COLD = 'AC_COLD',       // < 20°C
  MODERATE = 'MODERATE',     // 22-24°C
  FAN_WARM = 'FAN_WARM',     // > 25°C or Fan only
}

@Schema({
  timestamps: true,
  collection: 'roommate_profiles',
})
export class RoommateProfile {
  @Prop({ required: true, default: 'univ-delhi-hostel', index: true })
  tenantId: string;

  @Prop({ required: true, unique: true, uppercase: true, index: true })
  studentRollNumber: string;

  @Prop({ required: true, enum: SleepSchedule, default: SleepSchedule.FLEXIBLE })
  sleepSchedule: SleepSchedule;

  @Prop({ required: true, enum: CleanlinessLevel, default: CleanlinessLevel.MODERATE })
  cleanliness: CleanlinessLevel;

  @Prop({ required: true, enum: StudyHabit, default: StudyHabit.SILENT_STUDY })
  studyHabit: StudyHabit;

  @Prop({ required: true, enum: SocialStyle, default: SocialStyle.BALANCED })
  socialStyle: SocialStyle;

  @Prop({ required: true, enum: RoomTempPreference, default: RoomTempPreference.MODERATE })
  roomTempPreference: RoomTempPreference;

  @Prop({ default: 'VEGETARIAN' })
  dietaryPreference: string; // "VEGETARIAN" | "NON_VEGETARIAN" | "EGGETARIAN"

  @Prop({ default: false })
  smokingDrinkingTolerant: boolean;

  @Prop({ default: 'English, Hindi' })
  preferredLanguages: string;

  @Prop({ default: '' })
  hobbiesNotes: string;
}

export const RoommateProfileSchema = SchemaFactory.createForClass(RoommateProfile);

