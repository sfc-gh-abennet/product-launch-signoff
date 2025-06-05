import Resolver from '@forge/resolver';
import { checkResponse } from './utils/checkResponse';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getChildIssues', async ({ context }) => {
  try {
    const issueKey = context.extension.issue.key;

    // Use the Jira search API with JQL to fetch all child issues (subtasks)
    // Request additional fields for better status tracking
    const searchResponse = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/search?jql=parent=${issueKey}&fields=key,summary,status,assignee,priority,updated&maxResults=100`
      );
    await checkResponse('Jira API', searchResponse);
    const searchData = await searchResponse.json();

    console.log('Launch signoff items loaded:', searchData.total || 0);

    const childIssues = (searchData.issues || []).map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status ? issue.fields.status.name : 'Unknown',
      statusCategory: issue.fields.status ? issue.fields.status.statusCategory.name : 'Unknown',
      assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
      assigneeAccountId: issue.fields.assignee ? issue.fields.assignee.accountId : null,
      priority: issue.fields.priority ? issue.fields.priority.name : 'None',
      updated: issue.fields.updated,
    }));

    // Sort by status (done items last) and then by priority
    const sortedIssues = childIssues.sort((a, b) => {
      // First sort by completion status (incomplete items first)
      const aDone = a.statusCategory === 'Done';
      const bDone = b.statusCategory === 'Done';
      
      if (aDone !== bDone) {
        return aDone ? 1 : -1; // Done items go to bottom
      }
      
      // Then sort by priority within same completion status
      const priorityOrder = { 'Highest': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Lowest': 4, 'None': 5 };
      return (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
    });

    return { 
      childIssues: sortedIssues,
      total: searchData.total || 0,
      parentIssue: issueKey
    };

  } catch (error) {
    console.error('Error fetching launch signoff items:', error);
    return { 
      childIssues: [],
      error: `Failed to load launch signoff items: ${error.message}`,
      total: 0
    };
  }
});

export const handler = resolver.getDefinitions();
