import { TFunction } from "i18next";

export function translateContent(
  t: TFunction,
  key: string | undefined,
  fallback: string
): string {
  if (!key) return fallback;
  const translated = t(key, { defaultValue: fallback });
  return translated === key ? fallback : translated;
}

export function translateScenarioTitle(
  t: TFunction,
  scenarioId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.title`, fallback);
}

export function translateScenarioDescription(
  t: TFunction,
  scenarioId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.description`, fallback);
}

export function translateScenarioLocation(
  t: TFunction,
  scenarioId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.location`, fallback);
}

export function translateSceneTitle(
  t: TFunction,
  scenarioId: string,
  sceneId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.scenes.${sceneId}.title`, fallback);
}

export function translateSceneDescription(
  t: TFunction,
  scenarioId: string,
  sceneId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.scenes.${sceneId}.description`, fallback);
}

export function translateNetworkDescription(
  t: TFunction,
  scenarioId: string,
  networkId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.networks.${networkId}.description`, fallback);
}

export function translateActionLabel(
  t: TFunction,
  scenarioId: string,
  actionId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.actions.${actionId}.label`, fallback);
}

export function translateTaskTitle(
  t: TFunction,
  scenarioId: string,
  taskId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.tasks.${taskId}.title`, fallback);
}

export function translateTaskDescription(
  t: TFunction,
  scenarioId: string,
  taskId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.tasks.${taskId}.description`, fallback);
}

export function translateConsequenceTitle(
  t: TFunction,
  scenarioId: string,
  consequenceId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.consequences.${consequenceId}.title`, fallback);
}

export function translateConsequenceDescription(
  t: TFunction,
  scenarioId: string,
  consequenceId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.consequences.${consequenceId}.description`, fallback);
}

export function translateConsequenceExplanation(
  t: TFunction,
  scenarioId: string,
  consequenceId: string,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.consequences.${consequenceId}.explanation`, fallback);
}

export function translateCascadingEffect(
  t: TFunction,
  scenarioId: string,
  consequenceId: string,
  index: number,
  fallback: string
): string {
  return translateContent(t, `scenarios.${scenarioId}.consequences.${consequenceId}.cascading.${index}`, fallback);
}
