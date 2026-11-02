import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type HostelDocument = HydratedDocument<Hostel>;

export enum BedStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
}

export enum RoomType {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE',
  TRIPLE = 'TRIPLE',
  DORMITORY = 'DORMITORY',
}

export enum HostelGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  COED = 'COED',
}

// -----------------------------------------------------------------------------
// Subdocument Level 3: Bed
// -----------------------------------------------------------------------------
@Schema({ _id: true, timestamps: false })
export class Bed {
  @Prop({ required: true, trim: true })
  bedNumber: string; // e.g. "BED-A", "B1"

  @Prop({
    required: true,
    enum: BedStatus,
    default: BedStatus.AVAILABLE,
    index: true,
  })
  status: BedStatus;

  @Prop({ required: true, default: false })
  isOccupied: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Student', default: null })
  occupiedByStudentId?: Types.ObjectId | null;

  @Prop({ default: null })
  reservedUntil?: Date | null;
}
export const BedSchema = SchemaFactory.createForClass(Bed);

// -----------------------------------------------------------------------------
// Subdocument Level 2: Room
// -----------------------------------------------------------------------------
@Schema({ _id: true, timestamps: false })
export class Room {
  @Prop({ required: true, trim: true })
  roomNumber: string; // e.g. "R-101", "204"

  @Prop({ required: true, min: 0 })
  floor: number;

  @Prop({ required: true, enum: RoomType, default: RoomType.DOUBLE })
  roomType: RoomType;

  @Prop({ required: true, min: 1 })
  capacity: number;

  @Prop({ type: [BedSchema], default: [] })
  beds: Bed[];

  @Prop({ required: true, default: false })
  isFullyOccupied: boolean;
}
export const RoomSchema = SchemaFactory.createForClass(Room);

// -----------------------------------------------------------------------------
// Document Level 1: Hostel Aggregate Root
// -----------------------------------------------------------------------------
@Schema({
  timestamps: true,
  collection: 'hostels',
  optimisticConcurrency: true,
})
export class Hostel {
  @Prop({ required: true, trim: true })
  name: string; // e.g. "Kilimanjaro Hall"

  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  code: string; // e.g. "HOSTEL-A"

  @Prop({ required: true, enum: HostelGender, index: true })
  gender: HostelGender;

  @Prop({ required: true, min: 0, default: 0 })
  totalRooms: number;

  @Prop({ required: true, min: 0, default: 0 })
  totalCapacity: number;

  @Prop({ required: true, min: 0, default: 0 })
  currentOccupancy: number;

  @Prop({ type: [RoomSchema], default: [] })
  rooms: Room[];

  @Prop({ required: true, default: true, index: true })
  isActive: boolean;
}

export const HostelSchema = SchemaFactory.createForClass(Hostel);

// Compound indexes for rapid concurrency checks and atomic bed allocation
HostelSchema.index({ code: 1, 'rooms.roomNumber': 1 });
HostelSchema.index({
  gender: 1,
  isActive: 1,
  'rooms.beds.status': 1,
});
HostelSchema.index({ 'rooms.beds._id': 1 });
