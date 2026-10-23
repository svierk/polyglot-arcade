export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Base64: { input: string; output: string; }
  Currency: { input: number | string; output: number; }
  Date: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  Double: { input: number | string; output: number; }
  Email: { input: string; output: string; }
  EncryptedString: { input: string; output: string; }
  /** Can be set to an ID or a Reference to the result of another mutation operation. */
  IdOrRef: { input: string; output: string; }
  JSON: { input: string; output: string; }
  Latitude: { input: number | string; output: number; }
  /** A 64-bit signed integer */
  Long: { input: number; output: number; }
  LongTextArea: { input: string; output: string; }
  Longitude: { input: number | string; output: number; }
  MultiPicklist: { input: string; output: string; }
  Percent: { input: number | string; output: number; }
  PhoneNumber: { input: string; output: string; }
  Picklist: { input: string; output: string; }
  RichTextArea: { input: string; output: string; }
  TextArea: { input: string; output: string; }
  Time: { input: string; output: string; }
  Url: { input: string; output: string; }
};

export type Arcade_Score__CCreateInput = {
  Arcade_Score__c: Arcade_Score__CCreateRepresentation;
};

export type Arcade_Score__CCreateRepresentation = {
  Account__c?: InputMaybe<Scalars['IdOrRef']['input']>;
  Duration_Seconds__c?: InputMaybe<Scalars['Double']['input']>;
  Game__c?: InputMaybe<Scalars['IdOrRef']['input']>;
  Level__c?: InputMaybe<Scalars['Double']['input']>;
  Score__c?: InputMaybe<Scalars['Double']['input']>;
  Source__c?: InputMaybe<Scalars['Picklist']['input']>;
};

export enum DataType {
  Address = 'ADDRESS',
  Anytype = 'ANYTYPE',
  Base64 = 'BASE64',
  Boolean = 'BOOLEAN',
  Combobox = 'COMBOBOX',
  Complexvalue = 'COMPLEXVALUE',
  Currency = 'CURRENCY',
  Date = 'DATE',
  Datetime = 'DATETIME',
  Double = 'DOUBLE',
  Email = 'EMAIL',
  Encryptedstring = 'ENCRYPTEDSTRING',
  Int = 'INT',
  Json = 'JSON',
  Junctionidlist = 'JUNCTIONIDLIST',
  Location = 'LOCATION',
  Long = 'LONG',
  Multipicklist = 'MULTIPICKLIST',
  Percent = 'PERCENT',
  Phone = 'PHONE',
  Picklist = 'PICKLIST',
  Reference = 'REFERENCE',
  String = 'STRING',
  Textarea = 'TEXTAREA',
  Time = 'TIME',
  Url = 'URL'
}

export enum FieldExtraTypeInfo {
  ExternalLookup = 'EXTERNAL_LOOKUP',
  ImageUrl = 'IMAGE_URL',
  IndirectLookup = 'INDIRECT_LOOKUP',
  Personname = 'PERSONNAME',
  Plaintextarea = 'PLAINTEXTAREA',
  Richtextarea = 'RICHTEXTAREA',
  SwitchablePersonname = 'SWITCHABLE_PERSONNAME'
}

export enum FormFactor {
  Large = 'LARGE',
  Medium = 'MEDIUM',
  Small = 'SMALL'
}

export enum LayoutComponentType {
  Canvas = 'CANVAS',
  CustomLink = 'CUSTOM_LINK',
  EmptySpace = 'EMPTY_SPACE',
  Field = 'FIELD',
  ReportChart = 'REPORT_CHART',
  VisualforcePage = 'VISUALFORCE_PAGE'
}

export enum LayoutMode {
  Create = 'CREATE',
  Edit = 'EDIT',
  View = 'VIEW'
}

export enum LayoutType {
  Compact = 'COMPACT',
  Full = 'FULL'
}

export enum ResultOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum TabOrder {
  LeftRight = 'LEFT_RIGHT',
  TopDown = 'TOP_DOWN'
}

export enum UiBehavior {
  Edit = 'EDIT',
  Readonly = 'READONLY',
  Required = 'REQUIRED'
}

export type HubGamesQueryVariables = Exact<{ [key: string]: never; }>;


export type HubGamesQuery = { uiapi: { query: { Arcade_Game__c?: { edges?: Array<{ node?: { Id: string, Name?: { value?: string | null } | null, Game_Key__c?: { value?: string | null } | null, Tagline__c?: { value?: string | null } | null, Framework__c?: { value?: string | null } | null, App_Url__c?: { value?: string | null } | null, Host_Saves_Score__c?: { value?: boolean | null } | null, Accent_Color__c?: { value?: string | null } | null, High_Score__c?: { value?: number | null } | null, Total_Plays__c?: { value?: number | null } | null } | null } | null> | null } | null } } };

export type HubLeaderboardQueryVariables = Exact<{
  gameKey?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type HubLeaderboardQuery = { uiapi: { query: { Arcade_Score__c?: { edges?: Array<{ node?: { Id: string, Score__c?: { value?: number | null } | null, Source__c?: { value?: string | null } | null, CreatedDate?: { value?: string | null } | null, CreatedBy?: { Name?: { value?: string | null } | null } | null } | null } | null> | null } | null } } };

export type HubCreateScoreMutationVariables = Exact<{
  input: Arcade_Score__CCreateInput;
}>;


export type HubCreateScoreMutation = { uiapi: { Arcade_Score__cCreate?: { Record?: { Id: string } | null } | null } };
