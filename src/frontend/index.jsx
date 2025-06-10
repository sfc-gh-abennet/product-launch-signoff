import React, { useState, useEffect, Fragment } from 'react';
import ForgeReconciler, { Text, DynamicTable, Button, Modal, ModalBody, ModalTransition, ModalTitle, ModalFooter, ModalHeader, Inline } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [launchItems, setLaunchItems] = useState([]);
  const [launchItemsError, setLaunchItemsError] = useState(null);
  const [engineeringItems, setEngineeringItems] = useState([]);
  const [engineeringError, setEngineeringError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignoffModal, setShowSignoffModal] = useState(false);
  const [signoffType, setSignoffType] = useState(''); // 'engineering' or 'product'
  const [isEngineeringSignedOff, setIsEngineeringSignedOff] = useState(false);
  const [isProductSignedOff, setIsProductSignedOff] = useState(false);

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
  const isProductReadyForSignoff = productLaunchStats.isReady && productLaunchItems.length > 0;
  const isEngineeringReadyForSignoff = (engineeringError || engineeringStats.isReady) && 
                                      (engineeringChecklistItems.length > 0 || engineeringError);
  const isReadyForSignoff = isProductReadyForSignoff && isEngineeringReadyForSignoff;

  const handleEngineeringSignoffClick = () => {
    setSignoffType('engineering');
    setShowSignoffModal(true);
  };

  const handleProductSignoffClick = () => {
    setSignoffType('product');
    setShowSignoffModal(true);
  };

  const handleSignoffConfirm = () => {
    if (signoffType === 'engineering' && isEngineeringReadyForSignoff) {
      setIsEngineeringSignedOff(true);
      setShowSignoffModal(false);
    } else if (signoffType === 'product' && isProductReadyForSignoff) {
      setIsProductSignedOff(true);
      setShowSignoffModal(false);
    }
  };

  const handleModalClose = () => {
    setShowSignoffModal(false);
    setSignoffType('');
  };

  // Create table head configuration
  const createTableHead = () => ({
    cells: [
      {
        key: 'launch-gate',
        content: 'Engineering/Product checklist item',
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
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* PANEL 1: OVERALL SIGNOFF STATUS */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Text size="xlarge" weight="bold">🚀 PRODUCT LAUNCH SIGNOFF STATUS</Text>
      <Text> </Text>
      
      {launchItemsError && (
        <Fragment>
          <Text>❌ Error: {launchItemsError}</Text>
          <Text> </Text>
        </Fragment>
      )}
      
      <Text>⚙️  Engineering Status: {isEngineeringSignedOff ? '✅ SIGNED OFF' : (isEngineeringReadyForSignoff ? '🔄 READY FOR SIGNOFF' : '⏸️ IN PROGRESS')}</Text>
      <Text>🎯 Product Status: {isProductSignedOff ? '✅ SIGNED OFF' : (isProductReadyForSignoff ? '🔄 READY FOR SIGNOFF' : '⏸️ IN PROGRESS')}</Text>
      <Text>🚀 Overall Launch Status: {isReadyForSignoff ? 'READY TO LAUNCH!' : 'IN PROGRESS'}</Text>
      
      <Text> </Text>
      <Text>─────────────────────────────────────────────────────────────────────────────────</Text>
      <Text> </Text>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* PANEL 2: ENGINEERING SIGNOFF */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Text size="xlarge" weight="bold">⚙️ ENGINEERING SIGNOFF</Text>
      <Text> </Text>
      
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
      
      {/* Engineering Director Signoff */}
      <Text> </Text>
      {isEngineeringSignedOff ? (
        <Fragment>
          <Text>✅ ENGINEERING APPROVED AND SIGNED OFF</Text>
          <Text>Engineering requirements have been officially approved for release.</Text>
        </Fragment>
      ) : (
        <Inline space="space.200">
          <Text>ENGINEERING DIRECTOR SIGNOFF</Text>
          <Button 
            appearance="primary"
            onClick={handleEngineeringSignoffClick}
          >
            Signoff
          </Button>
        </Inline>
      )}
      
      <Text> </Text>
      <Text>─────────────────────────────────────────────────────────────────────────────────</Text>
      <Text> </Text>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* PANEL 3: PRODUCT SIGNOFF */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Text size="xlarge" weight="bold">🎯 PRODUCT SIGNOFF</Text>
      <Text> </Text>
      
      <Text>Progress: {productLaunchStats.completed} of {productLaunchItems.length} items completed</Text>
      <Text>Status: {productLaunchStats.isReady ? '✅ READY' : '⏸️ IN PROGRESS'}</Text>
      <Text> </Text>
      
      {productLaunchItems.length > 0 ? (
        <DynamicTable
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
      
      {/* Product Director Signoff */}
      <Text> </Text>
      {isProductSignedOff ? (
        <Fragment>
          <Text>✅ PRODUCT APPROVED AND SIGNED OFF</Text>
          <Text>Product requirements have been officially approved for release.</Text>
        </Fragment>
      ) : (
        <Inline space="space.200">
          <Text>PRODUCT DIRECTOR SIGNOFF</Text>
          <Button 
            appearance="primary"
            onClick={handleProductSignoffClick}
          >
            Signoff
          </Button>
        </Inline>
      )}
      
      {/* Optional: Other Items Section */}
      {otherItems.length > 0 && (
        <Fragment>
          <Text> </Text>
          <Text>📋 OTHER TRACKED ITEMS ({otherItems.length} items not part of core launch checklist)</Text>
          <Text>These items are tracked but not required for director signoff.</Text>
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

      {/* Professional Modal Dialog */}
      <ModalTransition>
        {showSignoffModal && (
          <Modal onClose={handleModalClose} isBoldHeading>
            <ModalHeader>
              <ModalTitle>
                {signoffType === 'engineering' ? 'Engineering Director Signoff' : 'Product Director Signoff'}
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              {((signoffType === 'engineering' && isEngineeringReadyForSignoff) || 
                (signoffType === 'product' && isProductReadyForSignoff)) ? (
                <Fragment>
                  <Text>
                    ✅ All {signoffType} requirements have been completed and are ready for director approval.
                  </Text>
                  <Text> </Text>
                  <Text>
                    By confirming this signoff, you are officially approving that all {signoffType} 
                    launch requirements have been met and the feature is ready for release from a 
                    {signoffType} perspective.
                  </Text>
                  <Text> </Text>
                  <Text>
                    ⚠️ This action cannot be undone through the UI.
                  </Text>
                </Fragment>
              ) : (
                <Fragment>
                  <Text>
                    ❌ {signoffType === 'engineering' ? 'Engineering' : 'Product'} requirements are not yet complete.
                  </Text>
                  <Text> </Text>
                  <Text>
                    Please ensure all {signoffType} checklist items are completed before requesting director signoff.
                  </Text>
                  {signoffType === 'engineering' && engineeringError && (
                    <Fragment>
                      <Text> </Text>
                      <Text>Engineering Error: {engineeringError}</Text>
                    </Fragment>
                  )}
                </Fragment>
              )}
            </ModalBody>
            <ModalFooter>
              {((signoffType === 'engineering' && isEngineeringReadyForSignoff) || 
                (signoffType === 'product' && isProductReadyForSignoff)) ? (
                <Fragment>
                  <Button appearance="subtle" onClick={handleModalClose}>
                    Cancel
                  </Button>
                  <Button appearance="primary" onClick={handleSignoffConfirm}>
                    {signoffType === 'engineering' ? 'Confirm Engineering Signoff' : 'Confirm Product Signoff'}
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
