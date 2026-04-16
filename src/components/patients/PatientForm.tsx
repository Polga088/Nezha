'use client'

import { useFormContext } from 'react-hook-form'
import { Shield } from 'lucide-react'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ASSURANCE_TYPE_VALUES, ASSURANCE_TYPE_LABELS } from '@/lib/assurance-types'
import type { AssuranceTypeValue } from '@/lib/assurance-types'

/** Champs assurance — à utiliser dans un `<Form>` (react-hook-form). */
export type PatientAssuranceFieldValues = {
  assuranceType: AssuranceTypeValue
  matriculeAssurance: string
}

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: React.ElementType
  label: string
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
        <Icon size={15} />
      </div>
      <span className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
        {label}
      </span>
    </div>
  )
}

/** Section « Couverture sociale » — champs Prisma `assuranceType` & `matriculeAssurance`. */
export function PatientAssuranceFormSection() {
  const { control } = useFormContext()

  return (
    <div className="rounded-xl border border-slate-200/60 bg-slate-50/60 p-5 shadow-medical space-y-4">
      <SectionTitle icon={Shield} label="Couverture sociale" />
      <p className="-mt-1 text-xs text-slate-500">
        Régimes CNSS, CNOPS, FAR, RAMID, mutuelle ou aucune couverture — aligné sur le dossier patient.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="assuranceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type d&apos;assurance</FormLabel>
              <Select
                value={field.value ?? 'AUCUNE'}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger aria-label="Type d'assurance">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ASSURANCE_TYPE_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {ASSURANCE_TYPE_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="matriculeAssurance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro d&apos;immatriculation</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Ex. matricule CNSS / adhérent mutuelle"
                    autoComplete="off"
                    aria-label="Numéro d'immatriculation assurance"
                    className="pr-14"
                    {...field}
                    value={field.value ?? ''}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    si applicable
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
