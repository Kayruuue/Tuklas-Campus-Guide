package com.aljon.campusguide;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CampusCompass")
public class CampusCompassPlugin extends Plugin implements SensorEventListener {
    private SensorManager sensorManager;
    private Sensor rotationSensor;
    private Sensor accelerometer;
    private Sensor magnetometer;
    private boolean watching = false;
    private boolean hasGravity = false;
    private boolean hasMagneticField = false;
    private final float[] gravity = new float[3];
    private final float[] magneticField = new float[3];
    private final float[] rotationMatrix = new float[9];
    private final float[] orientation = new float[3];
    private long lastUpdateMs = 0;

    @Override
    public void load() {
        sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager == null) return;

        rotationSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        if (rotationSensor == null) {
            rotationSensor = sensorManager.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
        }
        if (rotationSensor == null) {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            magnetometer = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        boolean available = sensorManager != null &&
            (rotationSensor != null || (accelerometer != null && magnetometer != null));
        JSObject result = new JSObject();
        result.put("available", available);
        watching = available;
        if (available) registerSensors();
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        watching = false;
        if (sensorManager != null) sensorManager.unregisterListener(this);
        call.resolve();
    }

    private void registerSensors() {
        if (rotationSensor != null) {
            sensorManager.registerListener(this, rotationSensor, SensorManager.SENSOR_DELAY_UI);
        } else {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_UI);
            sensorManager.registerListener(this, magnetometer, SensorManager.SENSOR_DELAY_UI);
        }
    }

    @Override
    protected void handleOnPause() {
        if (sensorManager != null) sensorManager.unregisterListener(this);
    }

    @Override
    protected void handleOnResume() {
        if (watching) registerSensors();
    }

    @Override
    protected void handleOnDestroy() {
        watching = false;
        if (sensorManager != null) sensorManager.unregisterListener(this);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!watching) return;

        if (rotationSensor != null) {
            SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values);
        } else {
            if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
                System.arraycopy(event.values, 0, gravity, 0, 3);
                hasGravity = true;
            } else if (event.sensor.getType() == Sensor.TYPE_MAGNETIC_FIELD) {
                System.arraycopy(event.values, 0, magneticField, 0, 3);
                hasMagneticField = true;
            }
            if (!hasGravity || !hasMagneticField ||
                !SensorManager.getRotationMatrix(rotationMatrix, null, gravity, magneticField)) {
                return;
            }
        }

        long now = android.os.SystemClock.elapsedRealtime();
        if (now - lastUpdateMs < 100) return;
        lastUpdateMs = now;

        SensorManager.getOrientation(rotationMatrix, orientation);
        double heading = (Math.toDegrees(orientation[0]) + 360.0) % 360.0;
        JSObject data = new JSObject();
        data.put("heading", heading);
        notifyListeners("heading", data);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}
}
