/**
 * Référence — à copier dans votre projet NestJS (ex. src/patients/dto/create-patient.dto.ts).
 * Aligné sur prisma/schema.prisma → model Patient (noms Prisma : camelCase, sauf date_naissance).
 *
 * Service : mappez vers prisma.patient.create({ data: { ... } }) avec les MÊMES clés que le client Prisma.
 */
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Reprend l’enum Prisma `Sexe` */
export enum SexeDto {
  MASCULIN = 'MASCULIN',
  FEMININ = 'FEMININ',
}

export class CreatePatientDto {
  @IsString()
  nom!: string;

  @IsString()
  prenom!: string;

  /** ISO 8601 — convertir en `Date` dans le service : `new Date(dto.date_naissance)` */
  @IsDateString()
  date_naissance!: string;

  @IsOptional()
  @IsString()
  tel?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  antecedents?: string;

  /** Nom Prisma / colonne : `cin` — requis pour éviter "Unknown argument cin" : le champ doit exister dans schema.prisma + `prisma generate`. */
  @IsOptional()
  @IsString()
  cin?: string;

  @IsOptional()
  @IsEnum(SexeDto)
  sexe?: SexeDto;

  /** Champ Prisma `groupeSanguin` (@map("groupe_sanguin")) */
  @IsOptional()
  @IsString()
  groupeSanguin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(30)
  @Max(250)
  taille?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  poids?: number;
}
