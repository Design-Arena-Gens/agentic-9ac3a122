"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AddonModule,
  AddonState,
  BlueprintNode,
  BlueprintParameter,
  CommandBinding
} from "./types";

type State = AddonState & {
  updateMeta: <K extends keyof AddonState["meta"]>(
    key: K,
    value: AddonState["meta"][K]
  ) => void;
  selectModule: (id: string | null) => void;
  selectNode: (id: string | null) => void;
  addModule: () => void;
  cloneModule: (id: string) => void;
  updateModule: (id: string, patch: Partial<AddonModule>) => void;
  removeModule: (id: string) => void;
  addNode: (moduleId: string) => void;
  updateNode: (moduleId: string, nodeId: string, patch: Partial<BlueprintNode>) => void;
  removeNode: (moduleId: string, nodeId: string) => void;
  addParameter: (
    moduleId: string,
    nodeId: string,
    placement: "inputs" | "outputs"
  ) => void;
  updateParameter: (
    moduleId: string,
    nodeId: string,
    placement: "inputs" | "outputs",
    paramId: string,
    patch: Partial<BlueprintParameter>
  ) => void;
  removeParameter: (
    moduleId: string,
    nodeId: string,
    placement: "inputs" | "outputs",
    paramId: string
  ) => void;
  addCommand: (moduleId: string) => void;
  updateCommand: (
    moduleId: string,
    commandId: string,
    patch: Partial<CommandBinding>
  ) => void;
  removeCommand: (moduleId: string, commandId: string) => void;
  reset: () => void;
};

const createParameter = (name: string): BlueprintParameter => ({
  id: crypto.randomUUID(),
  name,
  kind: "string"
});

const createNode = (): BlueprintNode => ({
  id: crypto.randomUUID(),
  title: "Execute Task",
  description: "Runs a custom task in the editor or runtime.",
  category: "Utilities",
  inputs: [createParameter("Context")],
  outputs: [createParameter("Result")],
  body:
    "// Describe the node behaviour here. This will be exported as a comment in the generated C++ scaffold.\nreturn Result;"
});

const createModule = (): AddonModule => ({
  id: crypto.randomUUID(),
  name: "CoreModule",
  target: "EditorAndRuntime",
  description: "Primary module that ships with the add-on.",
  dependencies: ["Core", "Engine", "UnrealEd"],
  nodes: [createNode()],
  commands: [
    {
      id: crypto.randomUUID(),
      name: "OpenPalette",
      context: "LevelEditor",
      hotkey: "Ctrl+Alt+P",
      description: "Opens the add-on palette.",
      script: `UEditorUtilitySubsystem* UtilitySubsystem = GEditor->GetEditorSubsystem<UEditorUtilitySubsystem>();\nUtilitySubsystem->ExecuteUtility(FName("BP_OpenPaletteUtility"));`
    }
  ]
});

const defaultState: AddonState = {
  meta: {
    title: "AddOn Architect",
    identifier: "AddonArchitect",
    author: "StudioX",
    version: "1.0.0",
    minEngineVersion: "5.3",
    pluginType: "Hybrid",
    description:
      "Design a hybrid Blueprint/C++ add-on with modular nodes, editor commands, and export utilities."
  },
  modules: [createModule()],
  selectedModuleId: null,
  selectedNodeId: null
};

export const useAddonStore = create<State>()(
  persist(
    set => ({
      ...defaultState,
      updateMeta: (key, value) =>
        set(state => ({
          meta: { ...state.meta, [key]: value }
        })),
      selectModule: id =>
        set(state => ({
          selectedModuleId: id,
          selectedNodeId: id
            ? state.modules.find(mod => mod.id === id)?.nodes[0]?.id ?? null
            : null
        })),
      selectNode: id => set({ selectedNodeId: id }),
      addModule: () =>
        set(state => {
          const newModule = createModule();
          return {
            modules: [...state.modules, newModule],
            selectedModuleId: newModule.id,
            selectedNodeId: newModule.nodes[0]?.id ?? null
          };
        }),
      cloneModule: id =>
        set(state => {
          const existing = state.modules.find(mod => mod.id === id);
          if (!existing) return state;
          const cloned: AddonModule = {
            ...existing,
            id: crypto.randomUUID(),
            name: `${existing.name}Copy`,
            nodes: existing.nodes.map(node => ({
              ...node,
              id: crypto.randomUUID(),
              inputs: node.inputs.map(param => ({ ...param, id: crypto.randomUUID() })),
              outputs: node.outputs.map(param => ({ ...param, id: crypto.randomUUID() }))
            })),
            commands: existing.commands.map(command => ({
              ...command,
              id: crypto.randomUUID()
            }))
          };
          return {
            modules: [...state.modules, cloned],
            selectedModuleId: cloned.id,
            selectedNodeId: cloned.nodes[0]?.id ?? null
          };
        }),
      updateModule: (id, patch) =>
        set(state => ({
          modules: state.modules.map(mod => (mod.id === id ? { ...mod, ...patch } : mod))
        })),
      removeModule: id =>
        set(state => {
          const modules = state.modules.filter(mod => mod.id !== id);
          const nextSelected = modules.at(-1)?.id ?? null;
          return {
            modules,
            selectedModuleId: nextSelected,
            selectedNodeId:
              nextSelected && modules.length
                ? modules.find(mod => mod.id === nextSelected)?.nodes[0]?.id ?? null
                : null
          };
        }),
      addNode: moduleId =>
        set(state => {
          const node = createNode();
          return {
            modules: state.modules.map(mod =>
              mod.id === moduleId ? { ...mod, nodes: [...mod.nodes, node] } : mod
            ),
            selectedModuleId: moduleId,
            selectedNodeId: node.id
          };
        }),
      updateNode: (moduleId, nodeId, patch) =>
        set(state => ({
          modules: state.modules.map(mod =>
            mod.id === moduleId
              ? {
                  ...mod,
                  nodes: mod.nodes.map(node =>
                    node.id === nodeId ? { ...node, ...patch } : node
                  )
                }
              : mod
          )
        })),
      removeNode: (moduleId, nodeId) =>
        set(state => {
          const modules = state.modules.map(mod =>
            mod.id === moduleId
              ? {
                  ...mod,
                  nodes: mod.nodes.filter(node => node.id !== nodeId)
                }
              : mod
          );
          const activeModule = modules.find(mod => mod.id === moduleId);
          return {
            modules,
            selectedModuleId: moduleId,
            selectedNodeId: activeModule?.nodes[0]?.id ?? null
          };
        }),
      addParameter: (moduleId, nodeId, placement) =>
        set(state => ({
          modules: state.modules.map(mod =>
            mod.id === moduleId
              ? {
                  ...mod,
                  nodes: mod.nodes.map(node =>
                    node.id === nodeId
                      ? {
                          ...node,
                          [placement]: [
                            ...node[placement],
                            createParameter(
                              placement === "inputs" ? "InputParam" : "OutputParam"
                            )
                          ]
                        }
                      : node
                  )
                }
              : mod
          )
        })),
      updateParameter: (moduleId, nodeId, placement, paramId, patch) =>
        set(state => ({
          modules: state.modules.map(mod =>
            mod.id === moduleId
              ? {
                  ...mod,
                  nodes: mod.nodes.map(node =>
                    node.id === nodeId
                      ? {
                          ...node,
                          [placement]: node[placement].map(param =>
                            param.id === paramId ? { ...param, ...patch } : param
                          )
                        }
                      : node
                  )
                }
              : mod
          )
        })),
      removeParameter: (moduleId, nodeId, placement, paramId) =>
        set(state => ({
          modules: state.modules.map(mod =>
            mod.id === moduleId
              ? {
                  ...mod,
                  nodes: mod.nodes.map(node =>
                    node.id === nodeId
                      ? {
                          ...node,
                          [placement]: node[placement].filter(param => param.id !== paramId)
                        }
                      : node
                  )
                }
              : mod
          )
        })),
      addCommand: moduleId =>
        set(state => ({
          modules: state.modules.map(mod =>
            mod.id === moduleId
              ? {
                  ...mod,
                  commands: [
                    ...mod.commands,
                    {
                      id: crypto.randomUUID(),
                      name: "NewCommand",
                      context: "LevelEditor",
                      hotkey: "Ctrl+Shift+N",
                      description: "Executes a custom command.",
                      script: "// Script body"
                    }
                  ]
                }
              : mod
          )
        })),
      updateCommand: (moduleId, commandId, patch) =>
        set(state => ({
          modules: state.modules.map(mod =>
            mod.id === moduleId
              ? {
                  ...mod,
                  commands: mod.commands.map(command =>
                    command.id === commandId ? { ...command, ...patch } : command
                  )
                }
              : mod
          )
        })),
      removeCommand: (moduleId, commandId) =>
        set(state => ({
          modules: state.modules.map(mod =>
            mod.id === moduleId
              ? {
                  ...mod,
                  commands: mod.commands.filter(command => command.id !== commandId)
                }
              : mod
          )
        })),
      reset: () => set({ ...defaultState })
    }),
    {
      name: "addon-architect-storage"
    }
  )
);
