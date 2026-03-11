import type { TranslationKey } from './pt-BR';

export const en: Record<TranslationKey, string> = {
  // Sidebar
  'nav.dashboard': 'Dashboard',
  'nav.assets': 'Equipment',
  'nav.newAsset': 'New Asset',
  'nav.export': 'Export',
  'nav.import': 'Import',
  'nav.movements': 'Movements',
  'nav.audit': 'Audit',
  'nav.training': 'Training',
  'nav.settings': 'Settings',
  'nav.help': 'Help',

  // Actions
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.delete': 'Delete',
  'action.edit': 'Edit',
  'action.create': 'Create',
  'action.back': 'Back',
  'action.confirm': 'Confirm',
  'action.export': 'Export',
  'action.import': 'Import',
  'action.search': 'Search',
  'action.filter': 'Filter',
  'action.clear': 'Clear',
  'action.print': 'Print',

  // Status
  'status.inUse': 'In Use',
  'status.stock': 'Stock',
  'status.maintenance': 'Maintenance',
  'status.retired': 'Retired',

  // Asset fields
  'field.serviceTag': 'Service Tag',
  'field.type': 'Equipment Type',
  'field.status': 'Status',
  'field.branch': 'Branch',
  'field.employee': 'Employee',
  'field.ram': 'RAM',
  'field.storage': 'Storage',
  'field.storageType': 'Storage Type',
  'field.os': 'Operating System',
  'field.cpu': 'Processor',
  'field.model': 'Model',
  'field.year': 'Year',
  'field.notes': 'Notes',
  'field.warranty': 'Warranty',

  // Messages
  'msg.success': 'Operation completed successfully!',
  'msg.error': 'An error occurred.',
  'msg.confirmDelete': 'Are you sure you want to delete?',
  'msg.loading': 'Loading...',
  'msg.noResults': 'No results found.',

  // App
  'app.name': 'AssetAgro',
  'app.subtitle': 'Tracbel Agro — IT',
};
