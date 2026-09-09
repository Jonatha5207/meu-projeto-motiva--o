package com.companheiro.dana.ble

import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.ParcelUuid
import java.util.UUID

private val HEART_RATE_SERVICE_UUID = UUID.fromString("0000180d-0000-1000-8000-00805f9b34fb")
private val HEART_RATE_MEASUREMENT_UUID = UUID.fromString("00002a37-0000-1000-8000-00805f9b34fb")
private val CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

// Web Bluetooth (o que o site usa no navegador normal) nao existe dentro do
// WebView do app nativo -- por isso o monitor cardiaco nunca funcionava aqui.
// Essa classe refaz a mesma coisa só com a API nativa de Bluetooth Low Energy
// do Android, seguindo o mesmo protocolo padrao "Heart Rate Service" que
// qualquer relogio/faixa BLE de frequencia cardiaca fala.
class HeartRateMonitor(private val context: Context) {

    private var gatt: BluetoothGatt? = null
    private var scanning = false

    fun connect(onConnected: (String) -> Unit, onBpm: (Int) -> Unit, onDisconnected: () -> Unit, onError: (String) -> Unit) {
        val manager = context.getSystemService(BluetoothManager::class.java)
        val adapter = manager?.adapter
        if (adapter == null || !adapter.isEnabled) { onError("bluetooth_off"); return }
        val scanner = adapter.bluetoothLeScanner
        if (scanner == null) { onError("scanner_unavailable"); return }

        val filters = listOf(ScanFilter.Builder().setServiceUuid(ParcelUuid(HEART_RATE_SERVICE_UUID)).build())
        val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()

        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                stopScan(scanner)
                connectToDevice(result.device, onConnected, onBpm, onDisconnected, onError)
            }
            override fun onScanFailed(errorCode: Int) { scanning = false; onError("scan_failed_$errorCode") }
        }

        try {
            scanning = true
            scanner.startScan(filters, settings, callback)
        } catch (e: SecurityException) { scanning = false; onError("missing_permission") }
    }

    private fun stopScan(scanner: android.bluetooth.le.BluetoothLeScanner) {
        if (!scanning) return
        scanning = false
        try { scanner.stopScan(object : ScanCallback() {}) } catch (e: SecurityException) { /* sem permissao, nada a fazer */ }
    }

    private fun connectToDevice(device: BluetoothDevice, onConnected: (String) -> Unit, onBpm: (Int) -> Unit, onDisconnected: () -> Unit, onError: (String) -> Unit) {
        val callback = object : BluetoothGattCallback() {
            override fun onConnectionStateChange(bluetoothGatt: BluetoothGatt, status: Int, newState: Int) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    try { bluetoothGatt.discoverServices() } catch (e: SecurityException) { onError("missing_permission") }
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    onDisconnected()
                }
            }

            override fun onServicesDiscovered(bluetoothGatt: BluetoothGatt, status: Int) {
                val characteristic = bluetoothGatt.getService(HEART_RATE_SERVICE_UUID)?.getCharacteristic(HEART_RATE_MEASUREMENT_UUID)
                if (characteristic == null) { onError("heart_rate_service_not_found"); return }
                try {
                    bluetoothGatt.setCharacteristicNotification(characteristic, true)
                    val descriptor = characteristic.getDescriptor(CCCD_UUID)
                    descriptor?.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                    descriptor?.let { bluetoothGatt.writeDescriptor(it) }
                    onConnected(device.name ?: "monitor cardíaco")
                } catch (e: SecurityException) { onError("missing_permission") }
            }

            @Suppress("DEPRECATION")
            override fun onCharacteristicChanged(bluetoothGatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
                val value = characteristic.value ?: return
                onBpm(parseHeartRate(value))
            }
        }
        try {
            gatt = device.connectGatt(context, false, callback)
        } catch (e: SecurityException) { onError("missing_permission") }
    }

    private fun parseHeartRate(value: ByteArray): Int {
        val flags = value[0].toInt()
        val is16Bit = flags and 0x1 != 0
        return if (is16Bit) ((value[2].toInt() and 0xFF) shl 8) or (value[1].toInt() and 0xFF) else value[1].toInt() and 0xFF
    }

    fun disconnect() {
        try { gatt?.disconnect(); gatt?.close() } catch (e: SecurityException) { /* sem permissao, nada a fazer */ }
        gatt = null
    }
}
