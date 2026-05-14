const history: any[] = [];
export function addPublishHistory(entry: any) { history.push(entry); }
export function getPublishHistory() { return history; }
