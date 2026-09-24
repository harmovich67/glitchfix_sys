# 03 · User Flows

## A. Client — discovery journey

```
Landing ─► "Start your project" ─► Register (name, email, company, password)
   └─► Project created (status STARTED, workflow snapshot taken) ─► Wizard
Wizard loop:
   show visible steps (conditions evaluated live) ─► answer questions (autosave, debounced)
   ├─ AI assistant drawer: ask anything · "Apply" suggested features · "Improve" text answers
   ├─ status moves to REQUIREMENTS on first answer
   └─ Next / Back (step rail shows done / current / upcoming; branch steps appear/disappear)
Review screen ─► validates required visible questions ─► Submit
   └─► status UNDER_REVIEW · admins notified (dashboard + email + realtime) · timeline event
Client dashboard: status tracker · requirements (editable until approved) · files · conversation ·
                  clarification requests to answer · timeline
```

## B. Admin / Project Manager — intake to delivery

```
Notification "New project submitted" ─► Project detail
   ├─ read requirements dossier (grouped by step) · generate AI brief
   ├─ set priority, start/due dates
   ├─ assign project manager + developers ─► developers notified
   ├─ Approve requirements (locks client editing) or Reopen (client can edit again)
   └─ move status: DESIGN ─► DEVELOPMENT ─► TESTING ─► COMPLETED (client notified each time)
Moderation queue: developer messages held for approval ─► Approve / Hide
```

## C. Developer — workspace

```
"You were assigned to WLC-1042" ─► My projects ─► Project workspace
   ├─ Requirements dossier + AI brief + client files
   ├─ Request clarification ─► (moderated) ─► client answers in thread ─► mark resolved
   ├─ Internal thread with PM/admins · technical notes (pin important ones)
   ├─ Tasks board (todo / in progress / review / done)
   └─ Upload previews (visible to client) or internal files
```

## D. Super Admin — control plane

```
Workflow Builder
   ├─ templates list ─► set default · duplicate · delete
   ├─ steps: add · remove · reorder (drag) · enable/disable · condition ("show when project type is…")
   ├─ questions: add · edit type/options/validation · reorder · conditions · Arabic translations
   └─ Simulator: pick answers ─► see which steps a client would get ─► Save (version++)
AI Management: toggle AI · model · API key · persona · system instructions · temperature ·
               limits · capabilities · test connection · usage chart
Team: invite staff with role · deactivate · reset role      Audit log: filter by action / actor
Settings: developer↔client messaging mode · email notifications
```

## E. Notification matrix

| Event | Who is notified | Channels |
|---|---|---|
| Project submitted | Super Admins, Admins, PMs | dashboard, realtime, email |
| Member assigned | assigned user | dashboard, realtime, email |
| Status changed | client (+ project members) | dashboard, realtime, email to client |
| New message | other participants allowed to see the thread | dashboard, realtime |
| Message pending approval | Super Admins, Admins | dashboard, realtime |
| Clarification requested (approved) | client | dashboard, realtime, email |
| Requirements approved / reopened | client | dashboard, realtime |
| Task assigned | assignee | dashboard, realtime |
