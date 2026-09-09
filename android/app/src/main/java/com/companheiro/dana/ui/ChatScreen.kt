package com.companheiro.dana.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

data class ChatLine(val fromUser: Boolean, val text: String)

@Composable
fun ChatScreen(
    userName: String,
    lines: List<ChatLine>,
    isListening: Boolean,
    isThinking: Boolean,
    statusMessage: String?,
    alwaysOnEnabled: Boolean,
    trainingTime: String?,
    scheduledCallEnabled: Boolean,
    onMicTap: () -> Unit,
    onToggleAlwaysOn: (Boolean) -> Unit,
    onPickTrainingTime: () -> Unit,
    onToggleScheduledCall: (Boolean) -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Oi, $userName", style = MaterialTheme.typography.headlineSmall)
        Text("Toque no microfone e fale com a Dana", style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.weight(1f)) {
                Text("\"Ok Dana\" sempre ativo", style = MaterialTheme.typography.bodyMedium)
                Text("Fica ouvindo em segundo plano, sem precisar tocar em nada.", style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = alwaysOnEnabled, onCheckedChange = onToggleAlwaysOn)
        }
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Dana me chama no horário do treino", style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(4.dp))
                OutlinedButton(onClick = onPickTrainingTime) {
                    Text(if (trainingTime != null) "Horário: $trainingTime (toque pra mudar)" else "Escolher horário")
                }
            }
            Spacer(Modifier.width(8.dp))
            Switch(checked = scheduledCallEnabled, onCheckedChange = onToggleScheduledCall)
        }
        Spacer(Modifier.height(12.dp))

        LazyColumn(modifier = Modifier.weight(1f)) {
            items(lines) { line ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    horizontalArrangement = if (line.fromUser) Arrangement.End else Arrangement.Start,
                ) {
                    Surface(
                        color = if (line.fromUser) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer,
                        shape = MaterialTheme.shapes.medium,
                    ) {
                        Text(line.text, modifier = Modifier.padding(12.dp))
                    }
                }
            }
        }

        if (statusMessage != null) {
            Text(statusMessage, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(vertical = 8.dp))
        }

        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), contentAlignment = Alignment.Center) {
            FloatingActionButton(
                onClick = onMicTap,
                shape = CircleShape,
                containerColor = if (isListening) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
            ) {
                if (isThinking) CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                else Text(if (isListening) "⏹" else "🎤", style = MaterialTheme.typography.headlineMedium)
            }
        }
    }
}
