import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import {
  SITECORE_DATABASES,
  DICTIONARY_ENTRY_TEMPLATE_ID,
  LANGUAGES_PATH,
  type Language,
  DEFAULT_LANGUAGE,
} from "@/src/constants";
import type { SitecoreItem, Site, LanguageItem } from "@/src/types";

function escapeGraphQL(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function stripBraces(id: string): string {
  return id.replace(/[{}]/g, "").replace(/-/g, "");
}

export async function getSitecoreContextId(
  client: ClientSDK
): Promise<string> {
  const contextResponse = await client.query("application.context");
  const appContext = contextResponse.data as Record<string, unknown>;
  const resourceAccess = appContext?.resourceAccess as
    | Array<{ context?: { preview?: string } }>
    | undefined;
  return resourceAccess?.[0]?.context?.preview ?? "";
}

export async function queryAllLanguages(
  client: ClientSDK,
  sitecoreContextId: string
): Promise<LanguageItem[]> {
  try {
    const children = await queryItemChildren(client, sitecoreContextId, {
      path: LANGUAGES_PATH,
    });
    return children.map((child) => ({
      code: child.name,
      itemId: child.itemId,
    }));
  } catch (error) {
    console.error("Error fetching languages:", error);
    return [{ code: DEFAULT_LANGUAGE, itemId: "" }];
  }
}

export async function querySiteSupportedLanguageIds(
  client: ClientSDK,
  sitecoreContextId: string,
  siteRootPath: string,
  language: Language = DEFAULT_LANGUAGE
): Promise<string[]> {
  try {
    const settingsPath = `${siteRootPath}/Settings`;
    const response = await client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId },
        body: {
          query: `
            query {
              item(where: { database: "${SITECORE_DATABASES.MASTER}", path: "${escapeGraphQL(settingsPath)}", language: "${escapeGraphQL(language)}" }) {
                itemId
                name
                path
                fields(ownFields: false, excludeStandardFields: true) {
                  nodes { name value }
                }
              }
            }
          `,
        },
      },
    });

    type ItemResponse = Record<string, unknown> & {
      data?: { data?: { item?: SitecoreItem } };
    };

    const item = (response as ItemResponse).data?.data?.item;
    if (!item?.fields?.nodes) return [];

    const field = item.fields.nodes.find(
      (f) => f.name === "SupportedLanguages" || f.name === "Supported languages"
    );
    if (!field?.value) return [];

    return field.value
      .split("|")
      .map((id) => id.trim())
      .filter(Boolean);
  } catch (error) {
    console.error("Error fetching site supported languages:", error);
    return [];
  }
}

export async function querySiteLanguage(
  client: ClientSDK,
  sitecoreContextId: string,
  siteName: string
): Promise<string> {
  try {
    const response = await client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId },
        body: {
          query: `
            query {
              site(siteName: "${escapeGraphQL(siteName)}") {
                language
              }
            }
          `,
        },
      },
    });

    type SiteResponse = Record<string, unknown> & {
      data?: { data?: { site?: { language?: string } } };
    };

    return (response as SiteResponse).data?.data?.site?.language ?? DEFAULT_LANGUAGE;
  } catch (error) {
    console.error("Error fetching site language:", error);
    return DEFAULT_LANGUAGE;
  }
}

export async function querySites(
  client: ClientSDK,
  sitecoreContextId: string
): Promise<Site[]> {
  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          query GetSites {
            sites {
              name
              rootPath
              rootItem {
                itemId
              }
            }
          }
        `,
      },
    },
  });

  type SitesResponse = Record<string, unknown> & {
    data?: { data?: { sites?: Site[] } };
  };

  return (response as SitesResponse).data?.data?.sites ?? [];
}

export async function queryItemByPath(
  client: ClientSDK,
  sitecoreContextId: string,
  path: string,
  language: Language = DEFAULT_LANGUAGE
): Promise<SitecoreItem | null> {
  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          query {
            item(where: { database: "${SITECORE_DATABASES.MASTER}", path: "${escapeGraphQL(path)}", language: "${escapeGraphQL(language)}" }) {
              itemId
              name
              path
              fields(ownFields: true, excludeStandardFields: true) {
                nodes { name value }
              }
            }
          }
        `,
      },
    },
  });

  type ItemResponse = Record<string, unknown> & {
    data?: { data?: { item?: SitecoreItem } };
  };

  return (response as ItemResponse).data?.data?.item ?? null;
}

export async function queryItemById(
  client: ClientSDK,
  sitecoreContextId: string,
  itemId: string,
  language: Language = DEFAULT_LANGUAGE
): Promise<SitecoreItem | null> {
  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          query {
            item(where: { database: "${SITECORE_DATABASES.MASTER}", itemId: "${escapeGraphQL(itemId)}", language: "${escapeGraphQL(language)}" }) {
              itemId
              name
              path
              fields(ownFields: true, excludeStandardFields: true) {
                nodes { name value }
              }
            }
          }
        `,
      },
    },
  });

  type ItemResponse = Record<string, unknown> & {
    data?: { data?: { item?: SitecoreItem } };
  };

  return (response as ItemResponse).data?.data?.item ?? null;
}

export async function queryItemsByIds(
  client: ClientSDK,
  sitecoreContextId: string,
  itemIds: string[],
  language: Language = DEFAULT_LANGUAGE
): Promise<SitecoreItem[]> {
  if (itemIds.length === 0) return [];

  const aliases = itemIds
    .map(
      (id, i) => `
      item${i}: item(where: { database: "${SITECORE_DATABASES.MASTER}", itemId: "${escapeGraphQL(id)}", language: "${escapeGraphQL(language)}" }) {
        itemId
        name
        path
        fields(ownFields: true, excludeStandardFields: true) {
          nodes { name value }
        }
      }`
    )
    .join("\n");

  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: { query: `query { ${aliases} }` },
    },
  });

  type AliasedResponse = Record<string, unknown> & {
    data?: { data?: Record<string, SitecoreItem | null> };
  };

  const data = (response as AliasedResponse).data?.data;
  if (!data) return [];

  return itemIds
    .map((_, i) => data[`item${i}`])
    .filter((item): item is SitecoreItem => item != null);
}

export async function queryItemChildren(
  client: ClientSDK,
  sitecoreContextId: string,
  identifier: { path?: string; itemId?: string },
  language: Language = DEFAULT_LANGUAGE
): Promise<
  Array<{ itemId: string; name: string; path: string; hasChildren: boolean }>
> {
  const where = identifier.path
    ? `path: "${escapeGraphQL(identifier.path)}"`
    : `itemId: "${escapeGraphQL(identifier.itemId!)}"`;

  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          query {
            item(where: { database: "${SITECORE_DATABASES.MASTER}", ${where}, language: "${escapeGraphQL(language)}" }) {
              children {
                nodes {
                  itemId
                  name
                  path
                  hasChildren
                }
              }
            }
          }
        `,
      },
    },
  });

  type ChildrenResponse = Record<string, unknown> & {
    data?: {
      data?: {
        item?: {
          children?: {
            nodes?: Array<{
              itemId: string;
              name: string;
              path: string;
              hasChildren: boolean;
            }>;
          };
        };
      };
    };
  };

  return (response as ChildrenResponse).data?.data?.item?.children?.nodes ?? [];
}

export async function queryChildrenWithFields(
  client: ClientSDK,
  sitecoreContextId: string,
  parentPath: string,
  language: Language = DEFAULT_LANGUAGE
): Promise<SitecoreItem[]> {
  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          query {
            item(where: { database: "${SITECORE_DATABASES.MASTER}", path: "${escapeGraphQL(parentPath)}", language: "${escapeGraphQL(language)}" }) {
              children {
                nodes {
                  itemId
                  name
                  path
                  fields(ownFields: true, excludeStandardFields: true) {
                    nodes { name value }
                  }
                }
              }
            }
          }
        `,
      },
    },
  });

  type ChildrenFieldsResponse = Record<string, unknown> & {
    data?: {
      data?: {
        item?: { children?: { nodes?: SitecoreItem[] } };
      };
    };
  };

  return (
    (response as ChildrenFieldsResponse).data?.data?.item?.children?.nodes ?? []
  );
}

export async function createItem(
  client: ClientSDK,
  sitecoreContextId: string,
  parentId: string,
  templateId: string,
  itemName: string,
  language: Language = DEFAULT_LANGUAGE,
  fields?: Array<{ name: string; value: string }>
): Promise<SitecoreItem | null> {
  const fieldsStr = fields
    ? `fields: [${fields.map((f) => `{ name: "${escapeGraphQL(f.name)}", value: "${escapeGraphQL(f.value)}" }`).join(", ")}]`
    : "";

  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          mutation {
            createItem(input: {
              database: "${SITECORE_DATABASES.MASTER}"
              name: "${escapeGraphQL(itemName)}"
              parent: "${escapeGraphQL(parentId)}"
              templateId: "${escapeGraphQL(templateId)}"
              language: "${escapeGraphQL(language)}"
              ${fieldsStr}
            }) {
              item {
                itemId
                name
                path
                fields(ownFields: true, excludeStandardFields: true) {
                  nodes { name value }
                }
              }
            }
          }
        `,
      },
    },
  });

  type CreateResponse = Record<string, unknown> & {
    data?: { data?: { createItem?: { item?: SitecoreItem } } };
  };

  return (response as CreateResponse).data?.data?.createItem?.item ?? null;
}

export async function deleteItem(
  client: ClientSDK,
  sitecoreContextId: string,
  itemPath: string,
  permanently: boolean = false
): Promise<boolean> {
  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          mutation {
            deleteItem(input: {
              database: "${SITECORE_DATABASES.MASTER}"
              path: "${escapeGraphQL(itemPath)}"
              permanently: ${permanently}
            }) {
              successful
            }
          }
        `,
      },
    },
  });

  type DeleteResponse = Record<string, unknown> & {
    data?: { data?: { deleteItem?: { successful?: boolean } } };
  };

  return (response as DeleteResponse).data?.data?.deleteItem?.successful ?? false;
}

export async function addItemVersion(
  client: ClientSDK,
  sitecoreContextId: string,
  itemId: string,
  language: Language = DEFAULT_LANGUAGE
): Promise<SitecoreItem | null> {
  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          mutation {
            addItemVersion(input: {
              database: "${SITECORE_DATABASES.MASTER}"
              itemId: "${escapeGraphQL(itemId)}"
              language: "${escapeGraphQL(language)}"
            }) {
              item {
                itemId
                name
                path
                fields(ownFields: true, excludeStandardFields: true) {
                  nodes { name value }
                }
              }
            }
          }
        `,
      },
    },
  });

  type AddVersionResponse = Record<string, unknown> & {
    data?: { data?: { addItemVersion?: { item?: SitecoreItem } } };
  };

  return (response as AddVersionResponse).data?.data?.addItemVersion?.item ?? null;
}

export async function updateItemField(
  client: ClientSDK,
  sitecoreContextId: string,
  itemId: string,
  itemPath: string,
  fieldName: string,
  fieldValue: string,
  language: Language = DEFAULT_LANGUAGE,
  version: number = 1
): Promise<SitecoreItem | null> {
  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          mutation {
            updateItem(input: {
              fields: [
                {
                  name: "${escapeGraphQL(fieldName)}",
                  value: "${escapeGraphQL(fieldValue)}",
                  reset: false
                }
              ]
              database: "${SITECORE_DATABASES.MASTER}"
              itemId: "${escapeGraphQL(itemId)}"
              language: "${escapeGraphQL(language)}"
              path: "${escapeGraphQL(itemPath)}"
              version: ${version}
            }) {
              item {
                name
                itemId
                fields(ownFields: true, excludeStandardFields: true) {
                  nodes { name value }
                }
              }
            }
          }
        `,
      },
    },
  });

  type UpdateResponse = Record<string, unknown> & {
    data?: { data?: { updateItem?: { item?: SitecoreItem } } };
  };

  return (response as UpdateResponse).data?.data?.updateItem?.item ?? null;
}

export async function updateItemFieldByPath(
  client: ClientSDK,
  sitecoreContextId: string,
  itemPath: string,
  fieldName: string,
  fieldValue: string,
  language: Language = DEFAULT_LANGUAGE
): Promise<SitecoreItem | null> {
  const item = await queryItemByPath(client, sitecoreContextId, itemPath, language);
  if (!item) return null;

  return await updateItemField(
    client,
    sitecoreContextId,
    item.itemId,
    itemPath,
    fieldName,
    fieldValue,
    language,
    1
  );
}

export async function publishDictionary(
  client: ClientSDK,
  sitecoreContextId: string,
  dictionaryRootPath: string,
  languages: string[]
): Promise<string> {
  const langList = languages.map((l) => `"${l}"`).join(", ");
  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          mutation {
            publishItem(input: {
              rootItemPath: "${escapeGraphQL(dictionaryRootPath)}"
              languages: [${langList}]
              targetDatabases: "${SITECORE_DATABASES.EXPERIENCE_EDGE}"
              publishItemMode: SMART
              publishRelatedItems: false
              publishSubItems: true
            }) {
              operationId
            }
          }
        `,
      },
    },
  });

  type PublishResponse = Record<string, unknown> & {
    data?: {
      data?: { publishItem?: { operationId?: string } };
      errors?: Array<{ message?: string }>;
    };
  };

  const publishData = (response as PublishResponse).data;
  const operationId = publishData?.data?.publishItem?.operationId;
  if (!operationId) {
    const message =
      publishData?.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
      "No operation ID returned";
    throw new Error(message);
  }
  return operationId;
}

export async function searchDictionaryEntries(
  client: ClientSDK,
  sitecoreContextId: string,
  dictionaryRootId: string,
  keyword: string,
  language: Language = DEFAULT_LANGUAGE,
  pageSize: number = 15,
  pageIndex: number = 0
): Promise<{ totalCount: number; items: SitecoreItem[] }> {
  const templateId = stripBraces(DICTIONARY_ENTRY_TEMPLATE_ID);
  const rootId = stripBraces(dictionaryRootId);

  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          query {
            search(
              query: {
                index: "sitecore_master_index"
                searchStatement: {
                  criteria: [
                    { operator: MUST, field: "_template", value: "${templateId}" }
                    { operator: MUST, field: "_path", value: "${rootId}" }
                    { operator: MUST, field: "_language", value: "${escapeGraphQL(language)}" }
                    { criteriaType: CONTAINS, field: "_name", value: "${escapeGraphQL(keyword)}" }
                  ]
                }
                paging: { pageSize: ${pageSize}, pageIndex: ${pageIndex} }
              }
            ) {
              totalCount
              results {
                innerItem {
                  itemId
                  name
                  path
                  fields(ownFields: true, excludeStandardFields: true) {
                    nodes { name value }
                  }
                }
              }
            }
          }
        `,
      },
    },
  });

  type SearchResponse = Record<string, unknown> & {
    data?: {
      data?: {
        search?: {
          totalCount?: number;
          results?: Array<{ innerItem?: SitecoreItem }>;
        };
      };
    };
  };

  const searchData = (response as SearchResponse).data?.data?.search;
  const items =
    searchData?.results
      ?.map((r) => r.innerItem)
      .filter((item): item is SitecoreItem => item != null) ?? [];

  return {
    totalCount: searchData?.totalCount ?? 0,
    items,
  };
}

export async function fetchAllDictionaryEntries(
  client: ClientSDK,
  sitecoreContextId: string,
  options: {
    folderPath: string;
    language?: Language;
    keyword?: string;
    dictionaryRootId?: string;
  }
): Promise<SitecoreItem[]> {
  const { folderPath, language = DEFAULT_LANGUAGE, keyword, dictionaryRootId } = options;
  const BATCH_SIZE = 500;
  const allItems: SitecoreItem[] = [];
  let pageIndex = 0;

  while (true) {
    let result: { totalCount: number; items: SitecoreItem[] };

    if (keyword?.trim() && dictionaryRootId) {
      result = await searchDictionaryEntries(
        client,
        sitecoreContextId,
        dictionaryRootId,
        keyword,
        language,
        BATCH_SIZE,
        pageIndex
      );
    } else {
      result = await queryDictionaryEntries(
        client,
        sitecoreContextId,
        folderPath,
        language,
        BATCH_SIZE,
        pageIndex
      );
    }

    allItems.push(...result.items);

    if (allItems.length >= result.totalCount || result.items.length === 0) {
      break;
    }

    pageIndex++;
  }

  return allItems;
}

export async function queryDictionaryEntries(
  client: ClientSDK,
  sitecoreContextId: string,
  folderPath: string,
  language: Language = DEFAULT_LANGUAGE,
  pageSize: number = 250,
  pageIndex: number = 0
): Promise<{ totalCount: number; items: SitecoreItem[] }> {
  const templateId = stripBraces(DICTIONARY_ENTRY_TEMPLATE_ID);

  const response = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: `
          query {
            search(
              query: {
                index: "sitecore_master_index"
                searchStatement: {
                  criteria: [
                    { operator: MUST, field: "_template", value: "${templateId}" }
                    { operator: MUST, criteriaType: STARTSWITH, field: "_fullpath", value: "${escapeGraphQL(folderPath)}" }
                    { operator: MUST, field: "_language", value: "${escapeGraphQL(language)}" }
                  ]
                }
                paging: { pageSize: ${pageSize}, pageIndex: ${pageIndex} }
              }
            ) {
              totalCount
              results {
                innerItem {
                  itemId
                  name
                  path
                  fields(ownFields: true, excludeStandardFields: true) {
                    nodes { name value }
                  }
                }
              }
            }
          }
        `,
      },
    },
  });

  type SearchResponse = Record<string, unknown> & {
    data?: {
      data?: {
        search?: {
          totalCount?: number;
          results?: Array<{ innerItem?: SitecoreItem }>;
        };
      };
    };
  };

  const searchData = (response as SearchResponse).data?.data?.search;
  const items =
    searchData?.results
      ?.map((r) => r.innerItem)
      .filter((item): item is SitecoreItem => item != null) ?? [];

  return {
    totalCount: searchData?.totalCount ?? 0,
    items,
  };
}
