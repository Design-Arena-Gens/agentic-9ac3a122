import type { AddonState, BlueprintNode, CommandBinding } from "./types";

const formatParameters = (params: BlueprintNode["inputs"]) =>
  params.map(param => ({
    name: param.name,
    type: param.kind,
    isArray: param.isArray ?? false,
    defaultValue: param.defaultValue ?? null,
    description: param.description ?? ""
  }));

export const createUPluginDescriptor = (state: AddonState) => {
  const modules = state.modules.map(module => ({
    Name: module.name,
    Type: module.target,
    LoadingPhase: "Default",
    AdditionalDependencies: module.dependencies
  }));

  return JSON.stringify(
    {
      FileVersion: 3,
      Version: 1,
      VersionName: state.meta.version,
      FriendlyName: state.meta.title,
      EngineVersion: state.meta.minEngineVersion,
      Description: state.meta.description,
      Category: "Editor",
      CreatedBy: state.meta.author,
      CreatedByURL: "https://addon-architect.vercel.app",
      Modules: modules
    },
    null,
    2
  );
};

const createBlueprintNodeSnippet = (node: BlueprintNode) => {
  const inputs = node.inputs.map(param => `  ${param.kind} ${param.name};`).join("\n");
  const outputs = node.outputs
    .map(param => `  ${param.kind} ${param.name}${param.isArray ? "[]" : ""};`)
    .join("\n");

  return `UFUNCTION(BlueprintCallable, Category = "${node.category}")
static void ${node.title}(
${node.inputs
  .map(param => `    ${param.kind === "object" ? "UObject*" : "const " + param.kind} ${param.name}`)
  .join(",\n")}
);\n
// Description: ${node.description}
// Body Example:
/*
${node.body}
*/
// Outputs:
/*
${outputs || "// void"}
*/
// Inputs:
/*
${inputs || "// none"}
*/`;
};

const createCommandSnippet = (command: CommandBinding) => `FUICommandInfoDecl(
    CommandList,
    "${command.context}",
    "${command.name}",
    LOCTEXT("${command.name}", "${command.description}"),
    FInputChord(${command.hotkey
      .split("+")
      .map(token => `EKeys::${token.trim().replace("Ctrl", "LeftControl")}`)
      .join(", ")}),
    FSlateIcon()
).ExecuteAction(FExecuteAction::CreateLambda([]()
{
    ${command.script}
}));`;

export const createCppScaffold = (state: AddonState) => {
  const headerNodes = state.modules
    .map(module =>
      module.nodes
        .map(node => createBlueprintNodeSnippet(node))
        .map(snippet => `// Module: ${module.name}\n${snippet}`)
        .join("\n\n")
    )
    .filter(Boolean)
    .join("\n\n");

  const commandSnippets = state.modules
    .flatMap(module => module.commands)
    .map(command => `// Command: ${command.name}\n${createCommandSnippet(command)}`)
    .join("\n\n");

  return `#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"

class ${state.meta.identifier}Library : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:
${headerNodes
  .split("\n")
  .map(line => `    ${line}`)
  .join("\n")}
};

// Editor Command Bindings
void Register${state.meta.identifier}Commands(const TSharedRef<FUICommandList>& CommandList)
{
${commandSnippets
  .split("\n")
  .map(line => `    ${line}`)
  .join("\n")}
}`;
};

export const createBlueprintJSON = (state: AddonState) =>
  JSON.stringify(
    {
      meta: state.meta,
      modules: state.modules.map(module => ({
        ...module,
        nodes: module.nodes.map(node => ({
          id: node.id,
          title: node.title,
          category: node.category,
          description: node.description,
          inputs: formatParameters(node.inputs),
          outputs: formatParameters(node.outputs),
          body: node.body
        })),
        commands: module.commands
      }))
    },
    null,
    2
  );
