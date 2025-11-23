"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { useAddonStore } from "@/lib/store";
import { AddonModule, AddonState, BlueprintNode, BlueprintParameter } from "@/lib/types";
import {
  createBlueprintJSON,
  createCppScaffold,
  createUPluginDescriptor
} from "@/lib/exporters";

const parameterKinds: BlueprintParameter["kind"][] = [
  "bool",
  "int",
  "float",
  "string",
  "vector",
  "rotator",
  "transform",
  "object",
  "name",
  "array",
  "map"
];

const moduleTargets: AddonModule["target"][] = ["Editor", "Runtime", "EditorAndRuntime"];

const downloadText = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const SectionCard = ({
  title,
  description,
  actions,
  children
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-primary-500/10 backdrop-blur">
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-primary-200">{title}</h2>
        {description ? (
          <p className="text-sm text-slate-400">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
    {children}
  </section>
);

const Field = ({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="group flex flex-col gap-1">
    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 group-focus-within:text-primary-300">
      {label}
    </span>
    {children}
  </label>
);

const TextInput = ({
  value,
  onChange,
  placeholder,
  multiline,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) =>
  multiline ? (
    <textarea
      className={clsx(
        "min-h-[120px] rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40",
        className
      )}
      value={value}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
    />
  ) : (
    <input
      className={clsx(
        "rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40",
        className
      )}
      value={value}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
    />
  );

const NodeParameterList = ({
  parameters,
  placement,
  onUpdate,
  onRemove,
  onAdd
}: {
  parameters: BlueprintParameter[];
  placement: "inputs" | "outputs";
  onUpdate: (paramId: string, patch: Partial<BlueprintParameter>) => void;
  onRemove: (paramId: string) => void;
  onAdd: () => void;
}) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/40">
    <header className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
      <span className="text-sm font-semibold text-primary-100 capitalize">
        {placement}
      </span>
      <button
        className="rounded-lg border border-primary-500/40 px-2 py-1 text-xs font-semibold text-primary-200 transition hover:border-primary-400 hover:bg-primary-500/10"
        onClick={onAdd}
        type="button"
      >
        Add
      </button>
    </header>
    <div className="space-y-3 p-3">
      {parameters.length === 0 ? (
        <p className="text-xs text-slate-500">No parameters yet.</p>
      ) : (
        parameters.map(param => (
          <div
            key={param.id}
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 shadow-inner shadow-slate-950/40"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <TextInput
                value={param.name}
                onChange={value => onUpdate(param.id, { name: value })}
                placeholder="Parameter Name"
              />
              <select
                className="rounded-xl border border-slate-800 bg-slate-950/80 px-2 py-2 text-sm text-slate-200 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40"
                value={param.kind}
                onChange={event =>
                  onUpdate(param.id, { kind: event.target.value as BlueprintParameter["kind"] })
                }
              >
                {parameterKinds.map(kind => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
              <button
                className="rounded-lg border border-red-500/30 px-2 py-1 text-xs font-semibold text-red-300 transition hover:border-red-400 hover:bg-red-400/20"
                onClick={() => onRemove(param.id)}
                type="button"
              >
                Remove
              </button>
            </div>
            <TextInput
              value={param.description ?? ""}
              onChange={value => onUpdate(param.id, { description: value })}
              placeholder="Purpose of this parameter"
              multiline
              className="text-xs"
            />
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <TextInput
                value={param.defaultValue ?? ""}
                onChange={value => onUpdate(param.id, { defaultValue: value })}
                placeholder="Default Value"
              />
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={param.isArray ?? false}
                  onChange={event => onUpdate(param.id, { isArray: event.target.checked })}
                  className="rounded border border-slate-600 bg-slate-950 accent-primary-500"
                />
                Array
              </label>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const NodeEditor = ({
  module,
  node
}: {
  module: AddonModule;
  node: BlueprintNode;
}) => {
  const { updateNode, addParameter, updateParameter, removeParameter } = useAddonStore();

  return (
    <div className="space-y-4">
      <Field label="Node Title">
        <TextInput
          value={node.title}
          onChange={value => updateNode(module.id, node.id, { title: value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <TextInput
            value={node.category}
            onChange={value => updateNode(module.id, node.id, { category: value })}
          />
        </Field>
        <Field label="Summary">
          <TextInput
            value={node.description}
            onChange={value => updateNode(module.id, node.id, { description: value })}
          />
        </Field>
      </div>
      <Field label="Execution Body Snippet">
        <TextInput
          value={node.body}
          onChange={value => updateNode(module.id, node.id, { body: value })}
          multiline
        />
      </Field>
      <div className="grid gap-4 lg:grid-cols-2">
        <NodeParameterList
          parameters={node.inputs}
          placement="inputs"
          onAdd={() => addParameter(module.id, node.id, "inputs")}
          onUpdate={(paramId, patch) => updateParameter(module.id, node.id, "inputs", paramId, patch)}
          onRemove={paramId => removeParameter(module.id, node.id, "inputs", paramId)}
        />
        <NodeParameterList
          parameters={node.outputs}
          placement="outputs"
          onAdd={() => addParameter(module.id, node.id, "outputs")}
          onUpdate={(paramId, patch) =>
            updateParameter(module.id, node.id, "outputs", paramId, patch)
          }
          onRemove={paramId => removeParameter(module.id, node.id, "outputs", paramId)}
        />
      </div>
    </div>
  );
};

const ModuleCommandList = ({ module }: { module: AddonModule }) => {
  const { addCommand, updateCommand, removeCommand } = useAddonStore();

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40">
      <header className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="text-sm font-semibold text-primary-100">Editor Commands</span>
        <button
          className="rounded-lg border border-primary-500/40 px-2 py-1 text-xs font-semibold text-primary-200 transition hover:border-primary-400 hover:bg-primary-500/10"
          onClick={() => addCommand(module.id)}
          type="button"
        >
          Add Command
        </button>
      </header>
      <div className="space-y-3 p-3">
        {module.commands.length === 0 ? (
          <p className="text-xs text-slate-500">No commands configured.</p>
        ) : (
          module.commands.map(command => (
            <div
              key={command.id}
              className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <TextInput
                  value={command.name}
                  onChange={value => updateCommand(module.id, command.id, { name: value })}
                  placeholder="Command Name"
                />
                <TextInput
                  value={command.hotkey}
                  onChange={value => updateCommand(module.id, command.id, { hotkey: value })}
                  placeholder="Hotkey e.g. Ctrl+Alt+P"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <TextInput
                  value={command.context}
                  onChange={value => updateCommand(module.id, command.id, { context: value })}
                  placeholder="Context e.g. LevelEditor"
                />
                <TextInput
                  value={command.description}
                  onChange={value => updateCommand(module.id, command.id, { description: value })}
                  placeholder="Description"
                />
              </div>
              <Field label="Execution Script">
                <TextInput
                  value={command.script}
                  onChange={value => updateCommand(module.id, command.id, { script: value })}
                  multiline
                  className="text-xs"
                />
              </Field>
              <div className="flex justify-end">
                <button
                  className="rounded-lg border border-red-500/30 px-2 py-1 text-xs font-semibold text-red-300 transition hover:border-red-400 hover:bg-red-400/20"
                  onClick={() => removeCommand(module.id, command.id)}
                  type="button"
                >
                  Remove Command
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const AddonWorkspace = () => {
  const {
    meta,
    modules,
    selectedModuleId,
    selectedNodeId,
    updateMeta,
    addModule,
    addNode,
    updateModule,
    cloneModule,
    removeModule,
    selectModule,
    selectNode,
    removeNode,
    reset
  } = useAddonStore();
  const [previewTab, setPreviewTab] = useState<"blueprint" | "uplugin" | "cpp">("blueprint");
  const selectedModule = modules.find(module => module.id === selectedModuleId) ?? modules[0] ?? null;
  const selectedNode =
    selectedModule?.nodes.find(node => node.id === selectedNodeId) ??
    selectedModule?.nodes[0] ??
    null;

  useEffect(() => {
    if (!selectedModule && modules[0]) {
      selectModule(modules[0].id);
    }
  }, [modules, selectModule, selectedModule]);

  const exportState = useMemo<AddonState>(
    () => ({
      meta,
      modules,
      selectedModuleId,
      selectedNodeId
    }),
    [meta, modules, selectedModuleId, selectedNodeId]
  );

  const previewContent = useMemo(() => {
    switch (previewTab) {
      case "uplugin":
        return createUPluginDescriptor(exportState);
      case "cpp":
        return createCppScaffold(exportState);
      default:
        return createBlueprintJSON(exportState);
    }
  }, [previewTab, exportState]);

  const handleDownload = () => {
    if (previewTab === "blueprint") {
      downloadText(`${meta.identifier}.json`, createBlueprintJSON(exportState));
    } else if (previewTab === "uplugin") {
      downloadText(`${meta.identifier}.uplugin`, createUPluginDescriptor(exportState));
    } else {
      downloadText(`${meta.identifier}.h`, createCppScaffold(exportState));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-12">
      <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-8 shadow-2xl shadow-primary-500/20">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-primary-300">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary-400" />
            Unreal Addon Architect
          </div>
          <h1 className="text-4xl font-black text-primary-100">
            Blueprint + C++ Add-on Builder
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-slate-400">
          Model add-on metadata, editor modules, Blueprint nodes, and command bindings in
          a browser-native workspace. Export production-ready descriptors, scaffolding,
          and blueprint specs to accelerate Unreal Engine plug-in development.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-400 hover:bg-red-500/10"
          >
            Reset Workspace
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-xl border border-primary-500/60 bg-primary-500/10 px-4 py-2 text-sm font-semibold text-primary-100 transition hover:bg-primary-500/20"
          >
            Download {previewTab === "blueprint" ? "Blueprint Spec" : previewTab === "uplugin" ? "Descriptor" : "C++ Header"}
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <SectionCard
            title="Addon Metadata"
            description="Define the root descriptor used by Unreal Engine to register your plug-in."
          >
            <div className="space-y-4">
              <TextInput
                value={meta.title}
                onChange={value => updateMeta("title", value)}
                placeholder="Display Name"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  value={meta.identifier}
                  onChange={value => updateMeta("identifier", value)}
                  placeholder="C++ Identifier"
                />
                <TextInput
                  value={meta.author}
                  onChange={value => updateMeta("author", value)}
                  placeholder="Author"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <TextInput
                  value={meta.version}
                  onChange={value => updateMeta("version", value)}
                  placeholder="Version"
                />
                <TextInput
                  value={meta.minEngineVersion}
                  onChange={value => updateMeta("minEngineVersion", value)}
                  placeholder="Minimum UE Version"
                />
                <select
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40"
                  value={meta.pluginType}
                  onChange={event => updateMeta("pluginType", event.target.value as typeof meta.pluginType)}
                >
                  <option value="Code">Code</option>
                  <option value="Blueprint">Blueprint</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <TextInput
                value={meta.description}
                onChange={value => updateMeta("description", value)}
                placeholder="High level overview"
                multiline
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Modules"
            description="Organize features into editor/runtime modules."
            actions={
              <button
                type="button"
                onClick={addModule}
                className="rounded-lg border border-primary-500/40 px-3 py-1 text-xs font-semibold text-primary-200 transition hover:border-primary-400 hover:bg-primary-500/10"
              >
                Add Module
              </button>
            }
          >
            <div className="space-y-3">
              {modules.map(module => (
                <div
                  key={module.id}
                  className={clsx(
                    "flex flex-col gap-3 rounded-2xl border px-4 py-3 transition",
                    module.id === selectedModule?.id
                      ? "border-primary-500/60 bg-primary-500/10"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      className="flex-1 text-left text-sm font-semibold text-primary-100"
                      onClick={() => selectModule(module.id)}
                    >
                      {module.name}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-primary-400 hover:bg-primary-500/10"
                        onClick={() => cloneModule(module.id)}
                      >
                        Clone
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-300 transition hover:border-red-400 hover:bg-red-400/20"
                        onClick={() => removeModule(module.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <TextInput
                    value={module.description}
                    onChange={value => updateModule(module.id, { description: value })}
                    placeholder="Module description"
                    multiline
                    className="text-xs"
                  />
                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                    <TextInput
                      value={module.name}
                      onChange={value => updateModule(module.id, { name: value })}
                      placeholder="Module Name"
                    />
                    <select
                      className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40"
                      value={module.target}
                      onChange={event =>
                        updateModule(module.id, {
                          target: event.target.value as AddonModule["target"]
                        })
                      }
                    >
                      {moduleTargets.map(target => (
                        <option key={target} value={target}>
                          {target}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Field label="Dependencies (comma separated)">
                    <TextInput
                      value={module.dependencies.join(", ")}
                      onChange={value =>
                        updateModule(module.id, {
                          dependencies: value
                            .split(",")
                            .map(dep => dep.trim())
                            .filter(Boolean)
                        })
                      }
                      placeholder="Core, Engine, Slate"
                    />
                  </Field>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Blueprint Nodes"
            description="Design execution graph nodes exposed to designers."
            actions={
              selectedModule ? (
                <button
                  type="button"
                  onClick={() => addNode(selectedModule.id)}
                  className="rounded-lg border border-primary-500/40 px-3 py-1 text-xs font-semibold text-primary-200 transition hover:border-primary-400 hover:bg-primary-500/10"
                >
                  Add Node
                </button>
              ) : null
            }
          >
            {selectedModule ? (
              <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
                <div className="space-y-2">
                  {selectedModule.nodes.map(node => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => selectNode(node.id)}
                      className={clsx(
                        "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                        node.id === selectedNode?.id
                          ? "border-primary-500/60 bg-primary-500/10 text-primary-100"
                          : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                      )}
                    >
                      <span className="block truncate">{node.title}</span>
                      <span className="text-xs text-slate-500">{node.category}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  {selectedNode ? (
                    <>
                      <NodeEditor module={selectedModule} node={selectedNode} />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-300 transition hover:border-red-400 hover:bg-red-400/20"
                          onClick={() => removeNode(selectedModule.id, selectedNode.id)}
                        >
                          Delete Node
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Select a node to begin editing its inputs, outputs, and execution
                      snippet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Create a module to begin defining Blueprint nodes.
              </p>
            )}
          </SectionCard>

          {selectedModule ? <ModuleCommandList module={selectedModule} /> : null}
        </div>
      </div>

      <SectionCard
        title="Export Preview"
        description="Inspect and download the generated descriptors and scaffolding."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreviewTab("blueprint")}
              className={clsx(
                "rounded-lg border px-3 py-1 text-xs font-semibold transition",
                previewTab === "blueprint"
                  ? "border-primary-500/60 bg-primary-500/10 text-primary-100"
                  : "border-slate-700 text-slate-300 hover:border-slate-600"
              )}
            >
              Blueprint JSON
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("uplugin")}
              className={clsx(
                "rounded-lg border px-3 py-1 text-xs font-semibold transition",
                previewTab === "uplugin"
                  ? "border-primary-500/60 bg-primary-500/10 text-primary-100"
                  : "border-slate-700 text-slate-300 hover:border-slate-600"
              )}
            >
              Descriptor
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("cpp")}
              className={clsx(
                "rounded-lg border px-3 py-1 text-xs font-semibold transition",
                previewTab === "cpp"
                  ? "border-primary-500/60 bg-primary-500/10 text-primary-100"
                  : "border-slate-700 text-slate-300 hover:border-slate-600"
              )}
            >
              C++ Header
            </button>
          </div>
        }
      >
        <pre className="scrollbar-thin max-h-[420px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs leading-relaxed text-primary-100">
          {previewContent}
        </pre>
      </SectionCard>
    </div>
  );
};
