import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';

class ConnectionsScreen extends StatefulWidget {
  const ConnectionsScreen({required this.api, super.key});
  final RowanApiClient api;
  @override State<ConnectionsScreen> createState() => _ConnectionsScreenState();
}

class _ConnectionsScreenState extends State<ConnectionsScreen> {
  bool loading = true;
  String? error;
  List<dynamic> items = [];
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    try { final response = await widget.api.connections(); final data = response['connections'] ?? response['data']; if (data is List) items = data; } catch (exception) { error = exception.toString(); }
    if (mounted) setState(() => loading = false);
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Connections')), body: loading ? const Center(child: CircularProgressIndicator()) : error != null ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(error!, textAlign: TextAlign.center))) : items.isEmpty ? const Center(child: Text('No connected services reported by Rowan Core.')) : ListView.separated(padding: const EdgeInsets.all(18), itemCount: items.length, separatorBuilder: (context, index) => const SizedBox(height: 8), itemBuilder: (_, index) { final item = items[index] is Map ? items[index] as Map : <String, dynamic>{}; return ListTile(tileColor: Theme.of(context).colorScheme.surfaceContainerHighest, leading: const Icon(Icons.link), title: Text('${item['name'] ?? item['type'] ?? 'Connection'}'), subtitle: Text('${item['status'] ?? 'Status supplied by Rowan Core'}')); }));
}