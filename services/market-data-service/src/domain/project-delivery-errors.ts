export class ProjectAccessDenied extends Error { constructor(message: string) { super(message); this.name = "ProjectAccessDenied"; } }
export class DataVersionConflict extends Error { constructor(message: string) { super(message); this.name = "DataVersionConflict"; } }
