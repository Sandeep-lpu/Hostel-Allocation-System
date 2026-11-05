import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnnouncementDocument = HydratedDocument<Announcement>;

@Schema({ timestamps: true, collection: 'announcements' })
export class Announcement {
  @Prop({ required: true, default: 'univ-delhi-hostel', index: true })
  tenantId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, default: 'GENERAL' }) // 'ALLOCATION' | 'DEADLINE' | 'GENERAL' | 'URGENT'
  category: string;

  @Prop({ required: true, default: 'ALL' }) // 'ALL' | 'STUDENTS' | 'WARDENS'
  targetAudience: string;

  @Prop({ required: true, default: 'Dean of Student Welfare' })
  publishedBy: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);

