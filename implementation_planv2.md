# Migration vers Shadcn UI (Stade Ultime 10/10)

Nous allons remplacer nos composants "faits main" par la perfection d'accessibilité et de design de **Shadcn UI** basé sur Radix Primitives. C'est l'étape ultime de standardisation de notre plateforme.

## Phase 1 : Configuration et Injection CLI
- Création d'un fichier `components.json` statique pour contourner les prompts interactifs et appliquer instantanément : `style: "new-york"`, `baseColor: "slate"`, et `cssVariables: true`.
- Exécution de l'utilitaire d'installation : `npx shadcn-ui@latest add table dropdown-menu dialog sheet button input badge card sonner avatar --yes`.

## Phase 2 : Remplacement dans "Patients" (`/dashboard/patients/page.tsx`)
- Suppression de la structure standard `<table>` vers le composant complexe `<Table>` de shadcn.
- Ajout d'une colonne d'actions avec `<DropdownMenu>` (avec les options : Modifier, Supprimer, Voir Dossier).
- Transformation de la modale "Nouveau Patient" avec la combinaison `<Dialog>`, `<DialogContent>`, `<DialogHeader>`.
- Amélioration de l'input de recherche et remplacement au profit des composants natifs `<Input>` et `<Button>`.

## Phase 3 : Modale Agenda coulissante (`/dashboard/agenda/page.tsx`)
- Effacement de la modale centrale de prise de RDV au profit du magnifique composant latéral `<Sheet>`, glissant depuis la droite, optimisant drastiquement l'espace pour consulter le calendrier en même temps.
- Utilisation de `<Select>` (et ses enfants) via Shadcn.

## Phase 4 : Dashboard Médecin ("Cards & Badges")
- Remplacement strict des `div` personnalisées par les `<Card>`, `<CardHeader>`, et `<CardContent>` officiels pour un look Vercel assumé.
- Application de `<Avatar>` et `<AvatarImage>` / `<AvatarFallback>` pour tous les profils patient, et de `<Badge>` pour le statut "En salle d'attente".

## Phase 5 : Système de Notifications Globales (`Sonner`)
- Ajout du `<Toaster />` dans `layout.tsx`.
- Déclenchement d'un `toast.success("Dossier créé !")` ou `toast.error()` après validation des requêtes côté client.

---

## User Review Required

> [!WARNING]  
> Nous allons inclure plusieurs fichiers de composants natifs dans `src/components/ui/*.tsx`.
> Vos modifications visuelles "pure white" préexistantes (comme le `globals.css`) seront légèrement réajustées pour s'aligner mathématiquement aux requins variables CSS de Shadcn.
> **Souhaitez-vous que je valide officiellement l'exécution `npx shadcn-ui add ...` et toutes les refontes mentionnées dans ce plan ?**
