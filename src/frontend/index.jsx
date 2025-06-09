import React, { useState, useEffect, Fragment } from 'react';
import ForgeReconciler, { Text, DynamicTable, Button, Modal, ModalBody, ModalTransition, ModalTitle, ModalFooter, ModalHeader } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [launchItems, setLaunchItems] = useState([]);
  const [launchItemsError, setLaunchItemsError] = useState(null);
  const [engineeringItems, setEngineeringItems] = useState([]);
  const [engineeringError, setEngineeringError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignoffModal, setShowSignoffModal] = useState(false);
  const [isSignedOff, setIsSignedOff] = useState(false);

  useEffect(() => {
    const fetchLaunchItems = async () => {
      setIsLoading(true);
      try {
        const resp = await invoke('getChildIssues');
        setLaunchItems(resp.childIssues || []);
        setLaunchItemsError(resp.error || null);
        setEngineeringItems(resp.engineeringItems || []);
        setEngineeringError(resp.engineeringError || null);
      } catch (error) {
        setLaunchItemsError(`Failed to load data: ${error.message}`);
        setEngineeringError(`Failed to load engineering data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLaunchItems();
  }, []);

  const isDoneStatus = (statusCategory, statusName) => {
    if (statusCategory === 'Done') return true;
    const doneStatuses = ['Done', 'Closed', 'Resolved', 'Complete', 'Completed'];
    return doneStatuses.some(doneStatus => 
      statusName.toLowerCase().includes(doneStatus.toLowerCase())
    );
  };

  const isNotApplicableStatus = (statusCategory, statusName) => {
    const naStatuses = [
      'Not Applicable', 'N/A', 'NA', 'Not Required', 'Not Needed',
      'Skip', 'Skipped', 'Won\'t Do', 'Wont Do', 'Will Not Do',
      'Cancelled', 'Canceled', 'Not Relevant', 'Irrelevant',
      'Out of Scope', 'Not in Scope', 'Excluded', 'Exempted'
    ];
    return naStatuses.some(naStatus => 
      statusName.toLowerCase().includes(naStatus.toLowerCase())
    );
  };

  const getStatusIndicator = (statusCategory, statusName) => {
    // Check for Not Applicable first, before checking for Done status
    if (isNotApplicableStatus(statusCategory, statusName)) {
      return '⊘';
    } else if (isDoneStatus(statusCategory, statusName)) {
      return '✅';
    } else {
      return '❌';
    }
  };

  if (isLoading) {
    return <Text>Loading Product Launch Signoff Status...</Text>;
  }

  // Configurable Product Launch Checklist
  const productLaunchChecklist = [
    "Data Science - Metrics",
    "Launch and Sales Enablement", 
    "Sales Operations Coordination",
    "Pricing and Monetization",
    "Customer Enablement",
    "Customer Support Enablement",
    "Documentation",
    "Legal Review",
    "Feature Training"
  ];

  // Configurable Engineering Checklist
  const engineeringChecklist = [
    "X-features supported: Replication, SBR, Cloning, Bundles - Req for PuPr/GA",
    "Feature parameter registered",
    "Security reviewed",
    "Compliance reviewed",
    "Operational Readiness reviewed"
  ];

  // Filter items that match the product launch checklist
  const isProductLaunchItem = (item) => {
    const itemSummary = item.summary.trim();
    return productLaunchChecklist.some(checklistItem => 
      itemSummary === checklistItem || 
      itemSummary.toLowerCase().includes(checklistItem.toLowerCase()) ||
      checklistItem.toLowerCase().includes(itemSummary.toLowerCase())
    );
  };

  // Filter engineering items that match the engineering checklist
  const isEngineeringChecklistItem = (item) => {
    const itemSummary = item.summary.trim();
    return engineeringChecklist.some(checklistItem => 
      itemSummary === checklistItem || 
      itemSummary.toLowerCase().includes(checklistItem.toLowerCase()) ||
      checklistItem.toLowerCase().includes(itemSummary.toLowerCase())
    );
  };

  const productLaunchItems = launchItems.filter(item => isProductLaunchItem(item));
  const otherItems = launchItems.filter(item => !isProductLaunchItem(item));
  const engineeringChecklistItems = engineeringItems.filter(item => isEngineeringChecklistItem(item));

  const getCompletionStats = (items) => {
    const completed = items.filter(item => isDoneStatus(item.statusCategory, item.status)).length;
    const notApplicable = items.filter(item => isNotApplicableStatus(item.statusCategory, item.status)).length;
    const pending = items.length - completed - notApplicable;
    const isReady = pending === 0 && items.length > 0;
    return { completed, notApplicable, pending, isReady };
  };

  const productLaunchStats = getCompletionStats(productLaunchItems);
  const otherStats = getCompletionStats(otherItems);
  const engineeringStats = getCompletionStats(engineeringChecklistItems);
  
  const completedItems = productLaunchStats.completed + otherStats.completed + engineeringStats.completed;
  const notApplicableItems = productLaunchStats.notApplicable + otherStats.notApplicable + engineeringStats.notApplicable;
  const pendingItems = productLaunchStats.pending + otherStats.pending + engineeringStats.pending;
  const isReadyForSignoff = productLaunchStats.isReady && productLaunchItems.length > 0 && 
                          (engineeringError || engineeringStats.isReady) && 
                          (engineeringChecklistItems.length > 0 || engineeringError);

  const handleSignoffClick = () => {
    setShowSignoffModal(true);
  };

  const handleSignoffConfirm = () => {
    if (isReadyForSignoff) {
      setIsSignedOff(true);
      setShowSignoffModal(false);
    }
  };

  const handleModalClose = () => {
    setShowSignoffModal(false);
  };

  // Create table head configuration
  const createTableHead = () => ({
    cells: [
      {
        key: 'launch-gate',
        content: 'Launch Gate',
        isSortable: true,
        width: 50
      },
      {
        key: 'assignee',
        content: 'Assignee',
        isSortable: true,
        width: 35
      },
      {
        key: 'complete',
        content: 'Complete',
        isSortable: true,
        width: 15
      }
    ]
  });

  // Helper function to get user initials
  const getUserInitials = (assigneeName) => {
    if (!assigneeName || assigneeName === 'Unassigned') return '?';
    const names = assigneeName.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Helper function to format assignee display with avatar-like styling
  const formatAssigneeDisplay = (assigneeName) => {
    if (!assigneeName || assigneeName === 'Unassigned') {
      return '❓ Unassigned';
    }
    const initials = getUserInitials(assigneeName);
    return `👤 ${assigneeName}`;
  };

  // Create table rows from items
  const createTableRows = (items, prefix) => {
    return items.map((item, index) => {
      const indicator = getStatusIndicator(item.statusCategory, item.status);
      const assigneeDisplay = formatAssigneeDisplay(item.assignee);
      
      return {
        key: `${prefix}-row-${index}-${item.key}`,
        cells: [
          {
            key: 'launch-gate',
            content: item.summary
          },
          {
            key: 'assignee',
            content: assigneeDisplay
          },
          {
            key: 'complete',
            content: indicator
          }
        ]
      };
    });
  };

  return (
    <Fragment>
      <Text>🚀 Product Launch Signoff Status</Text>
      <Text> </Text>
      
      {launchItemsError && (
        <Fragment>
          <Text>❌ Error: {launchItemsError}</Text>
          <Text> </Text>
        </Fragment>
      )}
      
      <Text>📊 Progress: {completedItems} of {launchItems.length} items completed</Text>
      <Text> </Text>
      
      {launchItems.length > 0 ? (
        <Fragment>
          {/* Product Launch Requirements Panel */}
          <Text>🎯 PRODUCT LAUNCH REQUIREMENTS</Text>
          <Text>Progress: {productLaunchStats.completed} of {productLaunchItems.length} items completed</Text>
          <Text>Status: {productLaunchStats.isReady ? '✅ READY' : '⏸️ IN PROGRESS'}</Text>
          <Text> </Text>
          
          {productLaunchItems.length > 0 ? (
            <DynamicTable
              caption="Product Launch Checklist"
              head={createTableHead()}
              rows={createTableRows(productLaunchItems, 'product-launch')}
              rowsPerPage={10}
              isLoading={false}
              defaultSortKey="complete"
              defaultSortOrder="ASC"
              emptyView="No product launch requirements found."
            />
          ) : (
            <Text>No items found matching the product launch checklist.</Text>
          )}
          
          {otherItems.length > 0 && (
            <Fragment>
              <Text> </Text>
              <Text>📋 OTHER ITEMS ({otherItems.length} items not part of launch checklist)</Text>
              <Text>These items are tracked but not required for launch signoff.</Text>
              <Text> </Text>
              
              <DynamicTable
                caption="Other Work Items"
                head={createTableHead()}
                rows={createTableRows(otherItems, 'other')}
                rowsPerPage={5}
                isLoading={false}
                defaultSortKey="complete"
                defaultSortOrder="ASC"
                emptyView="No other items found."
              />
            </Fragment>
          )}
          
          <Text> </Text>
          
          {/* Engineering Signoff Panel */}
          <Text>⚙️ ENGINEERING SIGNOFF</Text>
          {engineeringError ? (
            <Fragment>
              <Text>⚠️ {engineeringError}</Text>
              <Text>Status: ❌ NOT READY</Text>
            </Fragment>
          ) : (
            <Fragment>
              <Text>Progress: {engineeringStats.completed} of {engineeringChecklistItems.length} items completed</Text>
              <Text>Status: {engineeringStats.isReady ? '✅ READY' : '⏸️ IN PROGRESS'}</Text>
              <Text> </Text>
              
              {engineeringChecklistItems.length > 0 ? (
                <DynamicTable
                  caption="Engineering Launch Checklist"
                  head={createTableHead()}
                  rows={createTableRows(engineeringChecklistItems, 'engineering')}
                  rowsPerPage={10}
                  isLoading={false}
                  defaultSortKey="complete"
                  defaultSortOrder="ASC"
                  emptyView="No engineering checklist items found."
                />
              ) : (
                <Text>No engineering checklist items found.</Text>
              )}
            </Fragment>
          )}
          
          <Text> </Text>
          <Text>🚀 Launch Status: {isReadyForSignoff ? 'READY TO LAUNCH!' : 'IN PROGRESS'}</Text>
          
          {/* Executive Signoff Panel */}
          <Text> </Text>
          <Text>━━━━━━━━━━━━━━━━━ EXECUTIVE SIGNOFF ━━━━━━━━━━━━━━━━━</Text>
          {isSignedOff ? (
            <Fragment>
              <Text>✅ LAUNCH APPROVED AND SIGNED OFF</Text>
              <Text>This product launch has been officially approved for release.</Text>
            </Fragment>
          ) : (
            <Fragment>
              <Button 
                text={isReadyForSignoff ? "Sign Off on Launch" : "Review Launch Status"}
                appearance={isReadyForSignoff ? "primary" : "warning"}
                onClick={handleSignoffClick}
              />
              <Text>Executive approval required before launch can proceed.</Text>
            </Fragment>
          )}
        </Fragment>
      ) : (
        <Fragment>
          <Text>No launch gates found. Create subtasks to track launch requirements.</Text>
        </Fragment>
      )}

      {/* Professional Modal Dialog */}
      <ModalTransition>
        {showSignoffModal && (
          <Modal onClose={handleModalClose} width="medium">
            <ModalHeader>
              <ModalTitle appearance={isReadyForSignoff ? undefined : "warning"}>
                {isReadyForSignoff ? "Launch Signoff Confirmation" : "Launch Not Ready for Signoff"}
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              {isReadyForSignoff ? (
                <Fragment>
                  <Text>✅ All product launch requirements have been completed or marked as not applicable.</Text>
                  <Text>This product is ready for launch!</Text>
                  <Text> </Text>
                  <Text>🎯 Product Launch Requirements: ✅ Ready ({productLaunchStats.completed} of {productLaunchItems.length} completed)</Text>
                  <Text>⚙️ Engineering Signoff: {engineeringError ? '❌ Error' : (engineeringStats.isReady ? '✅ Ready' : '⏸️ In Progress')} ({engineeringStats.completed} of {engineeringChecklistItems.length} completed)</Text>
                  {otherItems.length > 0 && (
                    <Text>📋 Other Items: {otherStats.completed} of {otherItems.length} completed (not required for launch)</Text>
                  )}
                  <Text> </Text>
                  <Text>🚀 Are you ready to officially sign off on this product launch?</Text>
                </Fragment>
              ) : (
                <Fragment>
                  <Text>⚠️ Product launch requirements are not yet complete.</Text>
                  <Text> </Text>
                  <Text>🎯 Product Launch Requirements: {productLaunchStats.isReady ? '✅ Ready' : '⏸️ In Progress'}</Text>
                  <Text>   • Completed: {productLaunchStats.completed}</Text>
                  <Text>   • Not Applicable: {productLaunchStats.notApplicable}</Text>
                  <Text>   • Pending: {productLaunchStats.pending}</Text>
                  <Text> </Text>
                  <Text>⚙️ Engineering Signoff: {engineeringError ? '❌ Error' : (engineeringStats.isReady ? '✅ Ready' : '⏸️ In Progress')}</Text>
                  {engineeringError ? (
                    <Text>   • {engineeringError}</Text>
                  ) : (
                    <Fragment>
                      <Text>   • Completed: {engineeringStats.completed}</Text>
                      <Text>   • Not Applicable: {engineeringStats.notApplicable}</Text>
                      <Text>   • Pending: {engineeringStats.pending}</Text>
                    </Fragment>
                  )}
                  <Text> </Text>
                  {otherItems.length > 0 && (
                    <Fragment>
                      <Text>📋 Other Items: {otherStats.completed} of {otherItems.length} completed</Text>
                      <Text>   (These items are not required for launch signoff)</Text>
                      <Text> </Text>
                    </Fragment>
                  )}
                  <Text>📋 Please complete all required product launch checklist items before signing off.</Text>
                </Fragment>
              )}
            </ModalBody>
            <ModalFooter>
              {isReadyForSignoff ? (
                <Fragment>
                  <Button appearance="subtle" onClick={handleModalClose}>
                    Cancel
                  </Button>
                  <Button appearance="primary" onClick={handleSignoffConfirm}>
                    Confirm Launch Signoff
                  </Button>
                </Fragment>
              ) : (
                <Button appearance="primary" onClick={handleModalClose}>
                  Close
                </Button>
              )}
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </Fragment>
  );
};

ForgeReconciler.render(<App />);
