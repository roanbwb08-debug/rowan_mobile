import React from 'react'
import { 
  Github as GitHub, 
  Slack, 
  Cloud, 
  ShoppingBag, 
  Calendar, 
  Database, 
  BarChart3,
  Globe,
  Terminal,
  Code2,
  FolderUp,
  AudioLines,
  Music,
  Image as ImageIcon,
  LineChart,
  Cpu
} from 'lucide-react'

export interface RowanApp {
  id: string
  name: string
  description: string
  category: 'Productivity' | 'Development' | 'Business' | 'Communication' | 'Storage' | 'Marketing' | 'Finance' | 'Shopping' | 'Media' | 'Automation' | 'Other'
  icon: React.ReactNode
  status: 'available' | 'coming_soon' | 'beta'
  authType: 'oauth' | 'api_key' | 'none'
  scopes?: string[]
  capabilities?: string[]
}

export const SUPPORTED_APPS: RowanApp[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Let Rowan work with your repositories, issues and development workflow.',
    category: 'Development',
    icon: <GitHub className="w-6 h-6" />,
    status: 'available',
    authType: 'oauth',
    scopes: ['repo', 'read:user', 'user:email'],
    capabilities: [
      'Read repositories',
      'Read issues',
      'Create issues',
      'Read pull requests'
    ]
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Search and read documents across your Google Drive workspace.',
    category: 'Storage',
    icon: <Cloud className="w-6 h-6" />,
    status: 'coming_soon',
    authType: 'oauth',
    capabilities: ['Search files', 'Read document content']
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect Rowan to your Slack channels for real-time collaboration.',
    category: 'Communication',
    icon: <Slack className="w-6 h-6" />,
    status: 'coming_soon',
    authType: 'oauth',
    capabilities: ['Read messages', 'Send messages', 'Monitor channels']
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Manage products, inventory and customer inquiries from your store.',
    category: 'Shopping',
    icon: <ShoppingBag className="w-6 h-6" />,
    status: 'beta',
    authType: 'api_key',
    capabilities: ['List products', 'Check inventory', 'View recent orders']
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Manage your schedule and coordinate meetings with Rowan.',
    category: 'Productivity',
    icon: <Calendar className="w-6 h-6" />,
    status: 'coming_soon',
    authType: 'oauth',
    capabilities: ['Read events', 'Create events', 'Check availability']
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync your Notion databases and pages with Rowan Core.',
    category: 'Productivity',
    icon: <Globe className="w-6 h-6" />,
    status: 'coming_soon',
    authType: 'oauth',
    capabilities: ['Read pages', 'Query databases']
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Analyze leads, opportunities and customer relationships.',
    category: 'Business',
    icon: <BarChart3 className="w-6 h-6" />,
    status: 'coming_soon',
    authType: 'oauth',
    capabilities: ['Read leads', 'Update opportunities', 'View customer history']
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Connect Rowan directly to your relational database.',
    category: 'Development',
    icon: <Database className="w-6 h-6" />,
    status: 'coming_soon',
    authType: 'api_key',
    capabilities: ['Execute queries', 'Analyze schema']
  },
  {
    id: 'terminal',
    name: 'Secure Terminal',
    description: 'Allow Rowan to interact with authorized command line consoles.',
    category: 'Development',
    icon: <Terminal className="w-6 h-6" />,
    status: 'coming_soon',
    authType: 'api_key',
    capabilities: ['Execute script drafts', 'Check process status']
  },
  {
    id: 'vscode',
    name: 'VS Code Extension',
    description: 'Real-time agentic software edits inside your VS Code window.',
    category: 'Development',
    icon: <Code2 className="w-6 h-6" />,
    status: 'coming_soon',
    authType: 'none',
    capabilities: ['Read active files', 'Propose edits']
  },
  {
    id: 'pdf-uploads',
    name: 'Knowledge Binder',
    description: 'Upload PDFs, Word, Excel, CSV, or ZIP files directly to Rowan.',
    category: 'Storage',
    icon: <FolderUp className="w-6 h-6" />,
    status: 'available',
    authType: 'none',
    capabilities: ['Extract table rows', 'Parse document text']
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs Voice',
    description: 'Enable ultra-realistic, low-latency synthesized conversational speech.',
    category: 'Media',
    icon: <AudioLines className="w-6 h-6" />,
    status: 'available',
    authType: 'api_key',
    capabilities: ['Synthesize text', 'Select vocal presets']
  },
  {
    id: 'suno',
    name: 'Suno Music',
    description: 'Unleash high-fidelity creative audio tracks from simple conceptual descriptions.',
    category: 'Media',
    icon: <Music className="w-6 h-6" />,
    status: 'coming_soon',
    authType: 'none',
    capabilities: ['Generate instrumental cues']
  },
  {
    id: 'dalle',
    name: 'DALL-E 3',
    description: 'Generate high-resolution vector and realistic images on Rowan demand.',
    category: 'Media',
    icon: <ImageIcon className="w-6 h-6" />,
    status: 'available',
    authType: 'api_key',
    capabilities: ['Generate creative artwork', 'Resize graphics']
  },
  {
    id: 'sandbox-broker',
    name: 'Sandbox Broker Connection',
    description: 'Execute trades, monitor holdings, and audit balances securely in sandbox.',
    category: 'Finance',
    icon: <LineChart className="w-6 h-6" />,
    status: 'available',
    authType: 'api_key',
    capabilities: ['Analyze tickers', 'Simulate trades', 'Query portfolio stats']
  },
  {
    id: 'zapier',
    name: 'Zapier Webhooks',
    description: 'Connect Rowan actions to thousands of external automated flows.',
    category: 'Automation',
    icon: <Cpu className="w-6 h-6" />,
    status: 'coming_soon',
    authType: 'api_key',
    capabilities: ['Trigger event hooks', 'Process dynamic JSON payloads']
  }
]
