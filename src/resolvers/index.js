import Resolver from '@forge/resolver';
import { checkResponse } from './utils/checkResponse';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getChildIssues', async ({ context }) => {
  try {
    const issueKey = context.extension.issue.key;

    // Fetch the main issue to get its links
    const issueResponse = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/issue/${issueKey}?fields=issuelinks`
      );
    await checkResponse('Jira API', issueResponse);
    const issueData = await issueResponse.json();

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

    // Find engineering work items linked through "implemented by" or "blocked by"
    let engineeringItems = [];
    let engineeringError = null;

    try {
      const issueLinks = issueData.fields.issuelinks || [];
      const engineeringKeys = [];

      // Look for "implemented by" or "blocked by" links
      for (const link of issueLinks) {
        const linkType = link.type.name.toLowerCase();
        if (linkType.includes('implement') || linkType.includes('block')) {
          if (link.outwardIssue) {
            engineeringKeys.push(link.outwardIssue.key);
          }
          if (link.inwardIssue) {
            engineeringKeys.push(link.inwardIssue.key);
          }
        }
      }

      console.log('Found engineering work items:', engineeringKeys);

      // Fetch engineering checklist items for each engineering work item
      for (const engKey of engineeringKeys) {
        try {
          // First, get direct children of the engineering work item
          const engChildrenResponse = await api
            .asApp()
            .requestJira(
              route`/rest/api/3/search?jql=parent=${engKey}&fields=key,summary,status,assignee&maxResults=100`
            );
          await checkResponse('Jira API', engChildrenResponse);
          const engChildrenData = await engChildrenResponse.json();

          const directChildren = (engChildrenData.issues || []).map((issue) => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status ? issue.fields.status.name : 'Unknown',
            statusCategory: issue.fields.status ? issue.fields.status.statusCategory.name : 'Unknown',
            assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
            assigneeAccountId: issue.fields.assignee ? issue.fields.assignee.accountId : null,
            parentKey: engKey
          }));

          // Look for "Launch Checklist items" child if no direct engineering checklist items found
          const launchChecklistItem = directChildren.find(child => 
            child.summary.toLowerCase().endsWith('launch checklist items')
          );

          if (launchChecklistItem) {
            // Fetch children of the "Launch Checklist items" issue
            const checklistChildrenResponse = await api
              .asApp()
              .requestJira(
                route`/rest/api/3/search?jql=parent=${launchChecklistItem.key}&fields=key,summary,status,assignee&maxResults=100`
              );
            await checkResponse('Jira API', checklistChildrenResponse);
            const checklistChildrenData = await checklistChildrenResponse.json();

            const checklistChildren = (checklistChildrenData.issues || []).map((issue) => ({
              key: issue.key,
              summary: issue.fields.summary,
              status: issue.fields.status ? issue.fields.status.name : 'Unknown',
              statusCategory: issue.fields.status ? issue.fields.status.statusCategory.name : 'Unknown',
              assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
              assigneeAccountId: issue.fields.assignee ? issue.fields.assignee.accountId : null,
              parentKey: engKey
            }));

            engineeringItems.push(...checklistChildren);
          } else {
            // Use direct children as engineering checklist items
            engineeringItems.push(...directChildren);
          }

        } catch (error) {
          console.error(`Error fetching engineering items for ${engKey}:`, error);
        }
      }

      if (engineeringKeys.length > 0 && engineeringItems.length === 0) {
        engineeringError = 'Engineering launch checklist not found in the Engineering work item, Please add Engineering launch checklist to the Engineering work item before signoff';
      }

    } catch (error) {
      console.error('Error fetching engineering work items:', error);
      engineeringError = `Failed to load engineering checklist: ${error.message}`;
    }

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
      engineeringItems: engineeringItems,
      engineeringError: engineeringError,
      total: searchData.total || 0,
      parentIssue: issueKey
    };

  } catch (error) {
    console.error('Error fetching launch signoff items:', error);
    return { 
      childIssues: [],
      engineeringItems: [],
      engineeringError: `Failed to load data: ${error.message}`,
      total: 0
    };
  }
});

export const handler = resolver.getDefinitions();
