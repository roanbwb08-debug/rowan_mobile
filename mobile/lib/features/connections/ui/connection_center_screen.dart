import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/rowan_api_client.dart';
import '../../auth/providers/auth_provider.dart';

enum ConnectionState {
  notConnected,
  connecting,
  connected,
  error,
  revoked
}

class ConnectionItem {
  final String id;
  final String name;
  final String category;
  final String description;
  final ConnectionState state;

  ConnectionItem({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.state,
  });

  ConnectionItem copyWith({ConnectionState? state}) {
    return ConnectionItem(
      id: id,
      name: name,
      category: category,
      description: description,
      state: state ?? this.state,
    );
  }
}

class ConnectionCenterScreen extends ConsumerStatefulWidget {
  const ConnectionCenterScreen({super.key});

  @override
  ConsumerState<ConnectionCenterScreen> createState() => _ConnectionCenterScreenState();
}

class _DeviceCategory {
  final String name;
  final IconData icon;
  _DeviceCategory(this.name, this.icon);
}

class _ConnectionCenterScreenState extends ConsumerState<ConnectionCenterScreen> {
  final List<_DeviceCategory> _categories = [
    _DeviceCategory('Devices', Icons.smartphone),
    _DeviceCategory('Websites', Icons.language),
    _DeviceCategory('Apps & Services', Icons.apps),
    _DeviceCategory('Developer Environment', Icons.code),
    _DeviceCategory('Data & Knowledge', Icons.storage),
    _DeviceCategory('Creative & Media', Icons.palette),
    _DeviceCategory('Real-World Context', Icons.sensors),
    _DeviceCategory('Finance & Business', Icons.attach_money),
    _DeviceCategory('Automation', Icons.smart_toy),
  ];

  int _selectedCategoryIndex = 0;
  bool _isLoading = false;
  List<ConnectionItem> _connections = [];

  @override
  void initState() {
    super.initState();
    _fetchRealConnections();
  }

  Future<void> _fetchRealConnections() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final apiClient = ref.read(apiClientProvider);
      final List<ConnectionItem> realItems = [];

      // 1. Fetch tenant connections
      final res = await apiClient.get('/api/tenant/connections');
      if (res.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(res.body);
        if (data['success'] == true && data['connections'] is List) {
          for (final conn in data['connections']) {
            realItems.add(
              ConnectionItem(
                id: conn['id'] ?? '',
                name: conn['name'] ?? 'Connection',
                category: _mapCategory(conn['type']),
                description: conn['url']?.isNotEmpty == true
                    ? conn['url']
                    : (conn['instructions']?.isNotEmpty == true
                        ? conn['instructions']
                        : 'Configured Rowan system integration node.'),
                state: conn['status'] == 'connected'
                    ? ConnectionState.connected
                    : ConnectionState.notConnected,
              ),
            );
          }
        }
      }

      // 2. Fetch active paired devices
      final devRes = await apiClient.get('/api/devices/list');
      if (devRes.statusCode == 200) {
        final Map<String, dynamic> devData = jsonDecode(devRes.body);
        if (devData['success'] == true && devData['devices'] is List) {
          for (final dev in devData['devices']) {
            realItems.add(
              ConnectionItem(
                id: dev['id'] ?? '',
                name: dev['deviceName'] ?? dev['deviceType'] ?? 'Rowan Companion Device',
                category: 'Devices',
                description: 'Status: ${dev['status'] ?? 'active'} • Last active: ${dev['lastHeartbeat'] ?? 'recently'}',
                state: dev['status'] == 'revoked'
                    ? ConnectionState.revoked
                    : ConnectionState.connected,
              ),
            );
          }
        }
      }

      if (realItems.isNotEmpty) {
        setState(() {
          _connections = realItems;
        });
      }
    } catch (e) {
      print('[ConnectionCenterScreen] Real connection fetch notice: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _mapCategory(String? type) {
    switch (type) {
      case 'website':
        return 'Websites';
      case 'app':
      case 'integration':
        return 'Apps & Services';
      case 'developer':
        return 'Developer Environment';
      case 'database':
        return 'Data & Knowledge';
      default:
        return 'Apps & Services';
    }
  }

  Future<void> _toggleConnection(ConnectionItem item) async {
    final isConnecting = item.state == ConnectionState.notConnected || item.state == ConnectionState.revoked;
    
    setState(() {
      _connections = _connections.map((c) {
        if (c.id == item.id) {
          return c.copyWith(state: isConnecting ? ConnectionState.connecting : ConnectionState.revoked);
        }
        return c;
      }).toList();
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      
      if (isConnecting) {
        if (item.category == 'Devices') {
          final response = await apiClient.post('/api/devices/pairing/create', {
            'deviceName': item.name,
            'deviceType': 'flutter_mobile',
          });
          if (response.statusCode == 200) {
            _updateItemState(item.id, ConnectionState.connected);
          } else {
            _updateItemState(item.id, ConnectionState.error);
          }
        } else {
          final response = await apiClient.post('/api/tenant/connections', {
            'id': item.id,
            'name': item.name,
            'type': item.category.toLowerCase().split(' ')[0],
            'status': 'connected',
          });
          if (response.statusCode == 200) {
            _updateItemState(item.id, ConnectionState.connected);
          } else {
            _updateItemState(item.id, ConnectionState.error);
          }
        }
      } else {
        if (item.category == 'Devices') {
          final response = await apiClient.post('/api/devices/${item.id}/revoke', {});
          if (response.statusCode == 200) {
            _updateItemState(item.id, ConnectionState.revoked);
          } else {
            _updateItemState(item.id, ConnectionState.error);
          }
        } else {
          final response = await apiClient.delete('/api/tenant/connections/${item.id}');
          if (response.statusCode == 200) {
            _updateItemState(item.id, ConnectionState.revoked);
          } else {
            _updateItemState(item.id, ConnectionState.error);
          }
        }
      }
    } catch (e) {
      _updateItemState(item.id, isConnecting ? ConnectionState.connected : ConnectionState.notConnected);
    }
  }

  void _updateItemState(String id, ConnectionState state) {
    if (!mounted) return;
    setState(() {
      _connections = _connections.map((c) {
        if (c.id == id) {
          return c.copyWith(state: state);
        }
        return c;
      }).toList();
    });
  }

  String _getConnectionStateLabel(ConnectionState state) {
    switch (state) {
      case ConnectionState.notConnected:
        return 'Not connected';
      case ConnectionState.connecting:
        return 'Connecting...';
      case ConnectionState.connected:
        return 'Connected';
      case ConnectionState.error:
        return 'Error';
      case ConnectionState.revoked:
        return 'Revoked';
    }
  }

  Color _getConnectionStateColor(ConnectionState state) {
    switch (state) {
      case ConnectionState.notConnected:
        return Colors.grey;
      case ConnectionState.connecting:
        return Colors.orange;
      case ConnectionState.connected:
        return Colors.emerald;
      case ConnectionState.error:
        return Colors.red;
      case ConnectionState.revoked:
        return Colors.redAccent;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedCategory = _categories[_selectedCategoryIndex].name;
    final filteredConnections = _connections.where((c) => c.category == selectedCategory).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('CONNECTION CENTER'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Responsive horizontal category selector (Category Bento List)
            Container(
              height: 60,
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                border: Border(bottom: BorderSide(color: Colors.grey.withOpacity(0.1))),
              ),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = index == _selectedCategoryIndex;
                  return Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: FilterChip(
                      selected: isSelected,
                      label: Text(
                        cat.name,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.grey[700],
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 12,
                        ),
                      ),
                      avatar: Icon(
                        cat.icon,
                        size: 16,
                        color: isSelected ? Colors.white : Colors.grey,
                      ),
                      backgroundColor: Colors.grey[100],
                      selectedColor: const Color(0xFF1E6091),
                      onSelected: (_) {
                        setState(() => _selectedCategoryIndex = index);
                      },
                    ),
                  );
                },
              ),
            ),
            
            // Connection Items List View
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : filteredConnections.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.link_off, size: 48, color: Colors.grey[400]),
                              const SizedBox(height: 16),
                              Text(
                                'No connections configured under $selectedCategory.',
                                style: const TextStyle(color: Colors.grey),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(20),
                          itemCount: filteredConnections.length,
                          itemBuilder: (context, index) {
                            final item = filteredConnections[index];
                            final stateColor = _getConnectionStateColor(item.state);
                            return Card(
                              margin: const EdgeInsets.only(bottom: 16),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                side: BorderSide(color: Colors.grey.withOpacity(0.12)),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(18.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.between,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            item.name,
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              letterSpacing: 0.1,
                                            ),
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: stateColor.withOpacity(0.08),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: stateColor.withOpacity(0.2), width: 0.5),
                                          ),
                                          child: Text(
                                            _getConnectionStateLabel(item.state),
                                            style: TextStyle(
                                              color: stateColor,
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      item.description,
                                      style: TextStyle(
                                        color: Colors.grey[600],
                                        fontSize: 13,
                                        height: 1.4,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        if (item.state == ConnectionState.connected)
                                          TextButton.icon(
                                            onPressed: () => _toggleConnection(item),
                                            icon: const Icon(Icons.link_off, size: 16, color: Colors.red),
                                            label: const Text(
                                              'Revoke',
                                              style: TextStyle(color: Colors.red, fontSize: 13),
                                            ),
                                          )
                                        else if (item.state == ConnectionState.notConnected || item.state == ConnectionState.revoked)
                                          ElevatedButton.icon(
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: const Color(0xFF1E6091),
                                              foregroundColor: Colors.white,
                                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                              elevation: 0,
                                            ),
                                            onPressed: () => _toggleConnection(item),
                                            icon: const Icon(Icons.link, size: 16),
                                            label: const Text(
                                              'Connect',
                                              style: TextStyle(fontSize: 13),
                                            ),
                                          )
                                        else if (item.state == ConnectionState.connecting)
                                          const SizedBox(
                                            height: 18,
                                            width: 18,
                                            child: CircularProgressIndicator(strokeWidth: 2),
                                          ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
