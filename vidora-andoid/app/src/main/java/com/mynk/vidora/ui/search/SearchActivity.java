package com.mynk.vidora.ui.search;

import android.os.Bundle;
import android.widget.EditText;

import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.utils.FullScreenHelper;

public class SearchActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_search);
        FullScreenHelper.enable(this);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        EditText etSearch = findViewById(R.id.et_search);
        etSearch.requestFocus();
    }
}
