# Settings Persistence

Settings are persisted as a Sitecore item in the **master database**, under the `/sitecore/system/Modules/Marketplace/` tree. Reads and writes go through the Sitecore XM Cloud Authoring GraphQL API (`xmc.authoring.graphql`).

---

## Sitecore Item Structure

```
/sitecore/system/Modules/
└── Marketplace/                ← shared folder for all marketplace apps
    └── [Module folder]/        ← folder item
        └── Settings            ← settings item (holds the JSON value)
```

Loads fall back to the legacy pre-Marketplace path (`/sitecore/system/Modules/[Module folder]/...`) so existing installs keep their settings; saves always write the new path.

### Item IDs and Template IDs

| Role                            | ID                                       |
|---------------------------------|------------------------------------------|
| Parent folder item ID           | `{08477468-D438-43D4-9D6A-6D84A611971C}` |
| Module folder template ID       | `{A87A00B1-E6DB-45AB-8B54-636FEC3B5523}` |
| Settings item template ID       | `{D2923FEE-DA4E-49BE-830C-E27764DFA269}` |

### Value Field

The `Settings` item has a single custom field:

| Field name | Type   | Description                                                                    |
|------------|--------|--------------------------------------------------------------------------------|
| `Value`    | string | JSON-serialized settings object — e.g. `{"minimumNumber":3,"numberOfDays":30}` |

Standard fields are excluded when reading/writing via GraphQL (`excludeStandardFields: true`, `ownFields: true`).

---

## Serialization

Settings are serialized as a flat JSON object and stored in the `Value` field as a string. On load, the JSON is parsed and merged over the hardcoded defaults, so missing keys fall back gracefully.

Default values:

| Field           | Default |
|-----------------|---------|
| `minimumNumber` | `3`     |
| `numberOfDays`  | `30`    |

---

## Load Flow

1. Query the item at the Settings path.
2. Find the field named `"Value"` in `fields.nodes`.
3. JSON-parse the value and merge it over the defaults.
4. Return defaults if the item does not exist or the field is missing/malformed.

---

## Save Flow

1. Check if the `Marketplace` folder exists under `/sitecore/system/Modules/`.
   - If not, create it under the parent folder ID using the module folder template ID.
2. Check if the module folder exists under the `Marketplace` folder.
   - If not, create it under the `Marketplace` folder's ID using the module folder template ID.
3. Check if the `Settings` item exists under the module folder.
   - If not, create it under the module folder ID using the settings item template ID.
4. Update the `"Value"` field with the JSON-serialized settings string.

---

## Context ID

All GraphQL operations require a `sitecoreContextId` (the **preview** context ID), extracted from:

```
appContext.resourceAccess[0].context.preview
```
