'use client'

import { useFormContext } from 'react-hook-form'
import { Shield, Loader2 } from 'lucide-react'

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
import { useInsuranceTypes } from '@/hooks/useInsuranceTypes'

/** Champs assurance — à utiliser dans un `<Form>` (react-hook-form). */
export type PatientAssuranceFieldValues = {
  insuranceTypeId: string
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

/** Section « Couverture sociale » — liste dynamique admin + matricule. */
export function PatientAssuranceFormSection() {
  const { control, watch } = useFormContext<PatientAssuranceFieldValues>()
  const currentId = watch('insuranceTypeId')
  const { types, isLoading } = useInsuranceTypes(currentId || undefined)

  return (
    <div className="rounded-xl border border-slate-200/60 bg-slate-50/60 p-5 shadow-medical space-y-4">
      <SectionTitle icon={Shield} label="Couverture sociale" />
      <p className="-mt-1 text-xs text-slate-500">
        Organismes configurés par l’administration — CNSS, mutuelle, etc.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="insuranceTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type d&apos;assurance</FormLabel>
              <Select
                value={field.value || ''}
                onValueChange={field.onChange}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger aria-label="Type d'assurance">
                    {isLoading ? (
                      <span className="flex items-center gap-2 text-slate-400">
                        <Loader2 className="h-3 w-3 animate-spin" /> Chargement…
                      </span>
                    ) : (
                      <SelectValue placeholder="Sélectionner" />
                    )}
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {!t.isActive ? ' (inactif)' : ''}
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
                  />
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
