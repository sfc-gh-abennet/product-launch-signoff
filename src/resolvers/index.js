import Resolver from '@forge/resolver';
import { checkResponse } from './utils/checkResponse';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getChildIssues', async ({ context }) => {
  const issueKey = context.extension.issue.key;

  // Use the Jira search API with JQL to fetch all child issues (subtasks)
  const searchResponse = await api
    .asApp()
    .requestJira(
      route`/rest/api/3/search?jql=parent=${issueKey}&fields=key,summary,status,assignee`
    );
  await checkResponse('Jira API', searchResponse);
  const searchData = await searchResponse.json();

  console.log('Full Jira search API response:', JSON.stringify(searchData, null, 2));

  const childIssues = (searchData.issues || []).map((issue) => ({
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status ? issue.fields.status.name : 'Unknown',
    assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
  }));

  return { childIssues };
});

export const handler = resolver.getDefinitions();
