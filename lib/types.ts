export type ParameterKind =
  | "bool"
  | "int"
  | "float"
  | "string"
  | "vector"
  | "rotator"
  | "transform"
  | "object"
  | "name"
  | "array"
  | "map";

export type BlueprintParameter = {
  id: string;
  name: string;
  kind: ParameterKind;
  defaultValue?: string;
  description?: string;
  isArray?: boolean;
};

export type BlueprintNode = {
  id: string;
  title: string;
  category: string;
  description: string;
  inputs: BlueprintParameter[];
  outputs: BlueprintParameter[];
  body: string;
};

export type CommandBinding = {
  id: string;
  name: string;
  context: string;
  hotkey: string;
  description: string;
  script: string;
};

export type AddonModule = {
  id: string;
  name: string;
  target: "Editor" | "Runtime" | "EditorAndRuntime";
  description: string;
  dependencies: string[];
  nodes: BlueprintNode[];
  commands: CommandBinding[];
};

export type AddonMeta = {
  title: string;
  identifier: string;
  author: string;
  version: string;
  minEngineVersion: string;
  pluginType: "Code" | "Blueprint" | "Hybrid";
  description: string;
};

export type AddonState = {
  meta: AddonMeta;
  modules: AddonModule[];
  selectedModuleId: string | null;
  selectedNodeId: string | null;
};
