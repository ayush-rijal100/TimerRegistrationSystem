import { ConnectedActionName, TrsRole, connectedActions } from "./actionRegistry";

export function getAllowedRoles(actionName: ConnectedActionName): TrsRole[] {
  return connectedActions.find((action) => action.name === actionName)?.allowedRoles ?? [];
}

export function canExecuteAction(actionName: ConnectedActionName, role: string): boolean {
  return getAllowedRoles(actionName).includes(role as TrsRole);
}
