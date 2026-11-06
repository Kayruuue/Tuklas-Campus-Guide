package com.aljon.campusguide;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(CampusCompassPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
