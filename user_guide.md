# Manuel d'Utilisation - Plateforme Nezha Medical

Ce guide a pour but de vous accompagner pas à pas dans l'utilisation quotidienne de la plateforme. Selon vos droits (Assistante ou Médecin), certaines fonctionnalités vous seront accessibles ou restreintes.

---

## Section 1 : Guide de l'Assistante

En tant qu'Assistante, votre rôle est primordial : vous êtes le premier contact. La gestion de l'agenda et le dossier administratif des patients relèvent de votre portail.

### 1️⃣ Se connecter à la plateforme
1. Rendez-vous sur la page de connexion de la plateforme (`http://localhost:3000/login`).
2. Entrez votre Email (ex: `assistante@clinique.com`) et votre mot de passe fourni par l'Administrateur (`admin123`).
3. Vous serez redirigée immédiatement vers **l'Agenda Général**.

### 2️⃣ Créer un Nouveau Patient
1. Depuis le menu principal (à gauche), cliquez sur l'onglet **"Patients"**.
2. Cliquez sur le bouton bleu **"Nouveau Patient"** situé en haut à droite.
3. Une modale s'ouvre : renseignez les informations obligatoires (Nom, Prénom, Téléphone, Date de Naissance).
4. Cliquez sur **"Créer le dossier"**. Le patient apparaît instantanément dans la liste grâce à la recherche en temps réel.

### 3️⃣ Planifier un Rendez-vous
1. Rendez-vous dans l'onglet **"Agenda"**.
2. Naviguez sur les différents jours de la semaine. Repérez un créneau horaire vide.
3. Cliquez ou sélectionnez avec votre souris un créneau libre. Une modale apparaît.
4. Entrez le Nom du Patient, spécifiez le motif (ex: Consultation Générale ou Urgence), puis **Validez**. Le RDV s'inscrit en couleur dans le calendrier de tous les praticiens.

### 4️⃣ Générer une Facture (Après la consultation)
1. Allez sur l'onglet **"Patients"**, et utilisez la barre de recherche pour trouver le patient tout juste sorti de la consultation.
2. Cliquez sur son nom pour ouvrir sa **Fiche Patient**.
3. Dans l'onglet **"Historique"**, repérez le rendez-vous du jour et cliquez sur le bouton **"Facturer"**.
4. Remplissez le montant (ex: 35€) et la méthode de paiement (ex: Carte Bancaire).
5. Appuyez sur **"Facturer et PDF"**. La facture se télécharge instantanément sur votre ordinateur et est prête à l'impression !

---

## Section 2 : Guide du Médecin

Le profil médecin vous accorde un pouvoir exclusif d'écriture sur les **données cliniques privées** (DME) et sur le module de prescription.

### 1️⃣ Se préparer pour la consultation
1. Connectez-vous avec vos identifiants (ex: `medecin@clinique.com`).
2. Sur l'Accueil (**Dashboard**), vous pouvez observer d'un simple coup d'œil les rendez-vous du jour vous concernant ainsi que les statistiques de votre cabinet.
3. Cliquez sur "Agenda" pour voir votre planning interactif, ou cliquez directement sur le nom de votre premier patient de la journée s'il apparait de manière saillante dans la liste.

### 2️⃣ Ouvrir et Explorer la Fiche Patient
Dans la Fiche Patient du profil sélectionné, notez les points d'informations critiques en en-tête (Dates de naissance, Contacts, et surtout **Allergies & Groupe Sanguin** qui sont mis en couleur).

### 3️⃣ Rédiger des Notes Cliniques (DME)
1. Cliquez sur l'onglet central **"Consultation (Médecin)"**. 
*(NB : Cet onglet possède un éditeur de texte non accessible au pôle secrétariat pour des questions de confidentialité)*.
2. Tapez le résumé de l'examen clinique de votre patient, et saisissez le diagnostic posé en fin de consultation.
3. Cliquez sur **"Enregistrer"** pour archiver ces données confidentiellement.

### 4️⃣ Générer une Ordonnance (Prescription)
1. Toujours depuis la vue **"Consultation (Médecin)"**, appuyez sur le bouton bleu **"Créer une ordonnance"** en haut à droite.
2. Une fenêtre superposée s'ouvre.
3. Remplissez les champs de traitement : `Médicament` (ex: Amoxicilline), `Posologie` (ex: 2/jour), et `Durée` (ex: 7 jours).
4. Pour ajouter une ligne de médicament supplémentaire, cliquez sur **"+ Ajouter un traitement"**.
5. Enfin, cliquez sur **"Générer PDF"**. L'ordonnance PDF est téléchargée formatée professionnellement avec un espace vierge en pied-de-page destiné à accueillir votre cachet ou votre signature manuscrite.

---
> Besoin d'aide supplémentaire ? Contactez votre Administrateur central.
